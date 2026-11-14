import httpStatus from 'http-status';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../../utils/prisma';
import AppError from '../../errors/AppError';
import config from '../../config';
import { sendMail } from '../../utils/sendMail';
import { CV_TYPES, deleteCv, detectCvExt, resolveCv, saveCv } from '../../utils/cvStorage';
import { pickTitle } from './job.service';
import { applicationBodySchema, applicationListQuerySchema } from './job.validation';

type ApplicationBody = z.infer<typeof applicationBodySchema>;
type ApplicationListQuery = z.infer<typeof applicationListQuerySchema>;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Strip CR/LF so applicant input cannot inject mail headers. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim();

const listInclude = {
  job: {
    select: {
      id: true,
      department: true,
      translations: { select: { lang: true, title: true } },
    },
  },
} as const;

/** Applications always show the job's EN title (fallback: first language), independent of UI language. */
const withJobTitle = <T extends { job: { translations: { lang: 'AZ' | 'EN' | 'RU'; title: string }[] } }>(a: T) => ({
  ...a,
  job: { ...a.job, title: pickTitle(a.job.translations) },
});

const sendHrEmail = async (applicationId: number) => {
  const app = await prisma.jobApplication.findUnique({
    where: { id: applicationId },
    include: { job: { include: { translations: true } } },
  });
  if (!app) return;
  const jobTitle = pickTitle(app.job.translations);
  try {
    const to = config.hr_email;
    if (!to) throw new Error('HR_EMAIL is not configured');
    const filePath = resolveCv(app.cvFilePath);
    if (!filePath) throw new Error('CV file path invalid');
    const row = (k: string, v: string) =>
      `<tr><td style="padding:6px 12px;color:#555"><b>${k}</b></td><td style="padding:6px 12px">${esc(v)}</td></tr>`;
    const html = `
      <h2 style="margin:0 0 12px">New job application</h2>
      <h3 style="margin:16px 0 4px">Applicant</h3>
      <table>${row('Name', app.fullName)}${row('Email', app.email)}${row('Phone', app.phone)}${row(
        'Applied at',
        app.appliedAt.toISOString(),
      )}</table>
      <h3 style="margin:16px 0 4px">Job</h3>
      <table>${row('Title', jobTitle)}${row('Department', app.job.department)}${row(
        'Location',
        app.job.location,
      )}${row('Job ID', String(app.job.id))}</table>
      ${app.message ? `<h3 style="margin:16px 0 4px">Message</h3><p style="white-space:pre-wrap">${esc(app.message)}</p>` : ''}
      <p style="color:#777;margin-top:16px">The CV is attached.</p>`;
    await sendMail({
      to,
      subject: oneLine(`New application: ${jobTitle} - ${app.fullName}`),
      html,
      replyTo: app.email,
      attachments: [
        {
          filename: app.cvOriginalName,
          path: filePath,
          contentType: app.cvMimeType,
        },
      ],
    });
    await prisma.jobApplication.update({
      where: { id: app.id },
      data: { emailStatus: 'SENT', emailError: null, emailAttempts: { increment: 1 } },
    });
  } catch (err) {
    console.error('HR email failed:', err);
    await prisma.jobApplication.update({
      where: { id: app.id },
      data: {
        emailStatus: 'FAILED',
        emailError: (err instanceof Error ? err.message : 'Unknown error').slice(0, 500),
        emailAttempts: { increment: 1 },
      },
    });
  }
};

const Submit = async (body: ApplicationBody, file: Express.Multer.File | undefined) => {
  if (!file) throw new AppError(httpStatus.BAD_REQUEST, 'CV file is required');

  // Real type from file signature; must agree with the declared extension.
  const realExt = detectCvExt(file.buffer);
  const declaredExt = file.originalname.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];
  if (!realExt || realExt !== declaredExt) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Invalid CV file. Only PDF, DOC and DOCX are accepted');
  }

  const fileName = await saveCv(file.buffer, realExt);
  try {
    const application = await prisma.$transaction(async (tx) => {
      // Row lock + expiry check in one statement: a concurrent expiry/unpublish cannot slip past.
      const open = await tx.$queryRaw<{ id: number }[]>(
        Prisma.sql`SELECT id FROM "Job"
                   WHERE id = ${body.jobId} AND status = 'PUBLISHED'
                     AND "expiresAt" > NOW() AND "postedAt" <= NOW()
                   FOR SHARE`,
      );
      if (open.length === 0) {
        const exists = await tx.job.findUnique({ where: { id: body.jobId }, select: { id: true } });
        throw exists
          ? new AppError(httpStatus.GONE, 'Applications for this job are closed')
          : new AppError(httpStatus.NOT_FOUND, 'Job not found');
      }
      const dup = await tx.jobApplication.findUnique({
        where: { jobId_email: { jobId: body.jobId, email: body.email } },
        select: { id: true },
      });
      if (dup) {
        throw new AppError(httpStatus.CONFLICT, 'You have already applied for this job');
      }
      return tx.jobApplication.create({
        data: {
          jobId: body.jobId,
          fullName: body.fullName,
          email: body.email,
          phone: body.phone,
          message: body.message,
          cvFilePath: fileName,
          cvOriginalName: oneLine(file.originalname).slice(0, 200),
          cvMimeType: CV_TYPES[realExt],
          cvSize: file.size,
        },
      });
    });

    // Email failure must never lose the application: sendHrEmail records FAILED and never throws.
    await sendHrEmail(application.id);
    return { id: application.id, appliedAt: application.appliedAt };
  } catch (err) {
    await deleteCv(fileName);
    throw err;
  }
};

const GetAll = async (q: ApplicationListQuery) => {
  const where: Prisma.JobApplicationWhereInput = {
    ...(q.jobId && { jobId: q.jobId }),
    ...(q.status && { status: q.status }),
    ...((q.from || q.to) && {
      appliedAt: {
        ...(q.from && { gte: q.from }),
        ...(q.to && { lte: new Date(q.to.getTime() + 24 * 60 * 60 * 1000 - 1) }),
      },
    }),
    ...(q.search && {
      OR: [
        { fullName: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
        { phone: { contains: q.search } },
      ],
    }),
  };
  const [total, data] = await prisma.$transaction([
    prisma.jobApplication.count({ where }),
    prisma.jobApplication.findMany({
      where,
      include: listInclude,
      orderBy: { appliedAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);
  return { data: data.map(withJobTitle), meta: { page: q.page, limit: q.limit, total } };
};

const GetById = async (id: number) => {
  const app = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: {
        select: {
          id: true,
          department: true,
          location: true,
          translations: { select: { lang: true, title: true } },
        },
      },
    },
  });
  if (!app) throw new AppError(httpStatus.NOT_FOUND, 'Application not found');
  return withJobTitle(app);
};

const UpdateStatus = async (id: number, status: ApplicationListQuery['status'] & string) => {
  await GetById(id);
  const updated = await prisma.jobApplication.update({ where: { id }, data: { status }, include: listInclude });
  return withJobTitle(updated);
};

const GetCv = async (id: number) => {
  const app = await GetById(id);
  const filePath = resolveCv(app.cvFilePath);
  if (!filePath) throw new AppError(httpStatus.NOT_FOUND, 'CV not found');
  return { filePath, name: app.cvOriginalName, mime: app.cvMimeType };
};

const ResendEmail = async (id: number) => {
  const app = await GetById(id);
  if (app.emailStatus === 'SENT') {
    throw new AppError(httpStatus.CONFLICT, 'Email was already sent');
  }
  await sendHrEmail(id);
  return GetById(id);
};

export const JobApplicationService = { Submit, GetAll, GetById, UpdateStatus, GetCv, ResendEmail };
