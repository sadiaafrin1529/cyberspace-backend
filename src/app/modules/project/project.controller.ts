import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import AppError from '../../errors/AppError';
import { ProjectService } from './project.service';
import { createProjectSchema, updateProjectSchema, projectListQuerySchema } from './project.validation';

const id = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(httpStatus.BAD_REQUEST, 'Invalid id');
  return n;
};

const CreateProject = catchAsync(async (req, res) => {
  const result = await ProjectService.CreateProject(createProjectSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Project created', data: result });
});

const GetAllProjects = catchAsync(async (req, res) => {
  const { data, meta } = await ProjectService.GetAllProjects(projectListQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Projects retrieved', meta, data });
});

const GetProject = catchAsync(async (req, res) => {
  const result = await ProjectService.GetProject(String(req.params.idOrSlug));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Project retrieved', data: result });
});

const UpdateProject = catchAsync(async (req, res) => {
  const result = await ProjectService.UpdateProject(id(req.params.id), updateProjectSchema.parse(req.body));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Project updated', data: result });
});

const DeleteProject = catchAsync(async (req, res) => {
  await ProjectService.DeleteProject(id(req.params.id));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Project deleted' });
});

export const ProjectController = { CreateProject, GetAllProjects, GetProject, UpdateProject, DeleteProject };
