import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { ProductService } from './product.service';
import sendResponse from '../../utils/sendResponse';
import httpStatus from 'http-status';
import { productFilterSchema, shopQuerySchema } from './product.query';

const GetAllProducts = catchAsync(async (req: Request, res: Response) => {
  const filter = productFilterSchema.parse(req.query);
  const hasFilter =
    filter.category.length > 0 ||
    filter.categoryId.length > 0 ||
    filter.brand.length > 0 ||
    !!filter.q ||
    filter.minPrice !== undefined ||
    filter.maxPrice !== undefined;
  const result = await ProductService.GetAllProducts(hasFilter ? filter : undefined);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Products retrieved', data: result });
});

const SearchShopProducts = catchAsync(async (req: Request, res: Response) => {
  const { items, meta } = await ProductService.SearchShopProducts(shopQuerySchema.parse(req.query));
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Products retrieved', data: items, meta });
});

const GetProductById = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.GetProductById(req.params.id);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product retrieved', data: result });
});

const CreateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.CreateProduct(req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.CREATED, message: 'Product created', data: result });
});

const UpdateProduct = catchAsync(async (req: Request, res: Response) => {
  const result = await ProductService.UpdateProduct(req.params.id, req.body);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product updated', data: result });
});

const DeleteProduct = catchAsync(async (req: Request, res: Response) => {
  await ProductService.DeleteProduct(req.params.id);
  sendResponse(res, { success: true, statusCode: httpStatus.OK, message: 'Product deleted' });
});

export const ProductController = { GetAllProducts, SearchShopProducts, GetProductById, CreateProduct, UpdateProduct, DeleteProduct };
