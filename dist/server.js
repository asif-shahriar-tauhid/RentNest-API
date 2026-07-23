
            import {createRequire} from 'module';
            const require = createRequire(import.meta.url);
        

// src/app.ts
import express from "express";
import cors from "cors";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var requiredEnvVars = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_TOKEN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET"
];
for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
var config_default = {
  port: process.env.PORT || 5e3,
  database_url: process.env.DATABASE_URL,
  app_url: process.env.APP_URL,
  jwt_access_secret: process.env.JWT_ACCESS_SECRET,
  jwt_access_expires_in: process.env.JWT_ACCESS_EXPIRES_IN,
  jwt_refresh_secret: process.env.JWT_REFRESH_TOKEN,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
  }
};

// src/app.ts
import cookieParser from "cookie-parser";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/utils/catchAsync.ts
var catchAsync = (fn) => {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

// src/lib/prisma.ts
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
var connectionString = `${process.env.DATABASE_URL}`;
var pool = new Pool({ connectionString });
var adapter = new PrismaPg(pool);
var prisma = new PrismaClient({ adapter });

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var createToken = (payload, secret, expiresIn) => {
  const token = jwt.sign(payload, secret, { expiresIn });
  return token;
};
var verifyToken = (token, secret) => {
  try {
    const verifiedToken = jwt.verify(token, secret);
    return {
      success: true,
      data: verifiedToken
    };
  } catch (error) {
    console.log("Token Verification failed", error);
    return {
      success: false,
      error: error.message
    };
  }
};
var jwtUtils = {
  createToken,
  verifyToken
};

// src/modules/auth/auth.service.ts
import bcrypt from "bcrypt";

// src/utils/AppError.ts
var AppError = class extends Error {
  statusCode;
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
};

// src/modules/auth/auth.service.ts
import httpStatus from "http-status";
var userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  profileImage: true,
  createdAt: true
};
var register = async (data) => {
  if (!["TENANT", "ADMIN", "LANDLORD"].includes(data.role)) {
    throw new AppError("Invalid role. Must be TENANT or LANDLORD.", httpStatus.BAD_REQUEST);
  }
  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email
    }
  });
  if (existingUser) {
    throw new AppError("User already exists with this email.", httpStatus.CONFLICT);
  }
  const hashedPassword = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role,
      phone: data.phone
    },
    select: userSelect
  });
  return user;
};
var login = async (data) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email }
  });
  if (!user) {
    throw new AppError("Invalid credentials", httpStatus.UNAUTHORIZED);
  }
  if (user.status === "BANNED") {
    throw new AppError("Your account has been banned. Please contact support.", httpStatus.FORBIDDEN);
  }
  const isPasswordMatch = await bcrypt.compare(data.password, user.password);
  if (!isPasswordMatch) throw new AppError("Invalid credentials", httpStatus.UNAUTHORIZED);
  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };
  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_access_secret,
    config_default.jwt_access_expires_in
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config_default.jwt_refresh_secret,
    config_default.jwt_refresh_expires_in
  );
  return { user, accessToken, refreshToken };
};
var myProfile = async (userId) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId
    },
    // Explicitly select fields to ensure password hash is never returned
    select: userSelect
  });
  return user;
};
var authService = {
  register,
  login,
  myProfile
};

// src/utils/sendResponse.ts
var sendResponse = (res, data) => {
  res.status(data.statusCode).json({
    success: data.success,
    statusCode: data.statusCode,
    message: data.message,
    data: data.data,
    meta: data.meta
  });
};

// src/modules/auth/auth.controller.ts
import httpStatus2 from "http-status";
var register2 = catchAsync(
  async (req, res, next) => {
    const result = await authService.register(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus2.OK,
      message: "User registered successfully",
      data: result
    });
  }
);
var login2 = catchAsync(
  async (req, res, next) => {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body
    );
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 15 * 60 * 1e3
      // 15 minutes
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1e3
      // 7 days
    });
    sendResponse(res, {
      success: true,
      statusCode: httpStatus2.OK,
      message: "User login successful.",
      data: { user, accessToken }
    });
  }
);
var myProfile2 = catchAsync(
  async (req, res, next) => {
    const user = await authService.myProfile(req.user.id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus2.OK,
      message: "User profile fetched successfully",
      data: user
    });
  }
);
var logout = catchAsync(
  async (req, res, next) => {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    sendResponse(res, {
      success: true,
      statusCode: httpStatus2.OK,
      message: "Logged out successfully",
      data: null
    });
  }
);
var authController = {
  register: register2,
  login: login2,
  myProfile: myProfile2,
  logout
};

// src/middlewares/auth.ts
import httpStatus3 from "http-status";
var auth = (...requiredRoles) => {
  return catchAsync(async (req, res, next) => {
    const token = req.cookies.accessToken ? req.cookies.accessToken : req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization?.split(" ")[1] : req.headers.authorization;
    if (!token) {
      throw new AppError(
        "You are not logged in. Please log in to access this resource",
        httpStatus3.UNAUTHORIZED
      );
    }
    const verifiedToken = jwtUtils.verifyToken(
      token,
      config_default.jwt_access_secret
    );
    if (!verifiedToken.success) {
      throw new AppError(verifiedToken.error, httpStatus3.UNAUTHORIZED);
    }
    const { email, id, role } = verifiedToken.data;
    if (requiredRoles.length && !requiredRoles.includes(role)) {
      throw new AppError(
        "Forbidden. You don't have permission to access this source.",
        httpStatus3.FORBIDDEN
      );
    }
    const existingUser = await prisma.user.findUnique({
      where: {
        id
      }
    });
    if (!existingUser) throw new AppError("User not found. Please log in again.", httpStatus3.UNAUTHORIZED);
    if (existingUser.status === "BANNED")
      throw new AppError("Your account is blocked. Please contact support", httpStatus3.FORBIDDEN);
    req.user = {
      email: existingUser.email,
      name: existingUser.name,
      id: existingUser.id,
      role: existingUser.role
    };
    next();
  });
};

// src/modules/auth/auth.route.ts
import { UserRole } from "@prisma/client";
var router = Router();
router.post("/register", authController.register);
router.post("/login", authController.login);
router.get(
  "/me",
  auth(UserRole.ADMIN, UserRole.LANDLORD, UserRole.TENANT),
  authController.myProfile
);
var authRoute = router;

// src/modules/admin/admin.route.ts
import { Router as Router2 } from "express";
import { UserRole as UserRole2 } from "@prisma/client";

// src/utils/pagination.ts
var getPagination = (req) => {
  const page = Math.max(1, parseInt(String(req.query["page"] ?? "1")) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(String(req.query["limit"] ?? "10")) || 10)
  );
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

// src/modules/admin/admin.service.ts
import httpStatus4 from "http-status";
var getAllUsers = async (req) => {
  const { page, limit, skip } = getPagination(req);
  const whatRole = req.query["role"];
  const where = whatRole ? { role: whatRole } : {};
  const [total, userList] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            properties: true,
            rentalRequests: true
          }
        }
      }
    })
  ]);
  return {
    users: userList,
    meta: {
      page,
      limit,
      total
    }
  };
};
var getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
      _count: {
        select: {
          properties: true,
          rentalRequests: true
        }
      }
    }
  });
  if (!user) throw new AppError("User not found", httpStatus4.NOT_FOUND);
  return user;
};
var updateUserStatus = async (id, status) => {
  if (!["ACTIVE", "BANNED"].includes(status))
    throw new AppError("Invalid status", httpStatus4.BAD_REQUEST);
  const user = await prisma.user.findUnique({
    where: { id }
  });
  if (!user) throw new AppError("User not found", httpStatus4.NOT_FOUND);
  if (user.role === "ADMIN")
    throw new AppError("Cannot update admin status", httpStatus4.FORBIDDEN);
  const updatedUser = await prisma.user.update({
    where: { id },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      status: true,
      createdAt: true
    }
  });
  return updatedUser;
};
var getAllProperties = async (req) => {
  const { page, limit, skip } = getPagination(req);
  const [total, properties] = await Promise.all([
    prisma.property.count(),
    prisma.property.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        landlord: { select: { id: true, name: true, email: true } },
        category: true
      }
    })
  ]);
  return { properties, meta: { page, limit, total } };
};
var getAllRentals = async (req) => {
  const { page, limit, skip } = getPagination(req);
  const [total, rentals] = await Promise.all([
    prisma.rentalRequests.count(),
    prisma.rentalRequests.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        property: { select: { id: true, title: true, rentAmount: true } },
        tenant: { select: { id: true, name: true, email: true } }
      }
    })
  ]);
  return { rentals, meta: { page, limit, total } };
};
var getAllPayments = async (req) => {
  const { page, limit, skip } = getPagination(req);
  const [total, payments] = await Promise.all([
    prisma.payment.count(),
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        rentalRequest: {
          include: {
            property: { select: { id: true, title: true } },
            tenant: { select: { id: true, name: true, email: true } }
          }
        }
      }
    })
  ]);
  return { payments, meta: { page, limit, total } };
};
var adminService = {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllProperties,
  getAllRentals,
  getAllPayments
};

// src/modules/admin/admin.controller.ts
import httpStatus5 from "http-status";
var getAllUsers2 = catchAsync(
  async (req, res, next) => {
    const { users, meta } = await adminService.getAllUsers(req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus5.OK,
      message: "Users fetched successfully",
      data: { users, meta }
    });
  }
);
var getUserById2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const user = await adminService.getUserById(id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus5.OK,
      message: "User profile fetched successfully",
      data: user
    });
  }
);
var updateUserStatus2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const user = await adminService.updateUserStatus(id, req.body.status);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus5.OK,
      message: "User status updated successfully",
      data: user
    });
  }
);
var getAllProperties2 = catchAsync(
  async (req, res, next) => {
    const { properties, meta } = await adminService.getAllProperties(req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus5.OK,
      message: "Properties fetched successfully",
      data: { properties, meta }
    });
  }
);
var getAllRentals2 = catchAsync(
  async (req, res, next) => {
    const { rentals, meta } = await adminService.getAllRentals(req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus5.OK,
      message: "Rentals fetched successfully",
      data: { rentals, meta }
    });
  }
);
var getAllPayments2 = catchAsync(
  async (req, res, next) => {
    const { payments, meta } = await adminService.getAllPayments(req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus5.OK,
      message: "Payments fetched successfully",
      data: { payments, meta }
    });
  }
);
var adminController = {
  getAllUsers: getAllUsers2,
  getUserById: getUserById2,
  updateUserStatus: updateUserStatus2,
  getAllProperties: getAllProperties2,
  getAllRentals: getAllRentals2,
  getAllPayments: getAllPayments2
};

// src/modules/admin/admin.route.ts
var router2 = Router2();
router2.use(auth(UserRole2.ADMIN));
router2.get("/users", adminController.getAllUsers);
router2.get("/users/:id", adminController.getUserById);
router2.patch("/users/:id/status", adminController.updateUserStatus);
router2.get("/properties", adminController.getAllProperties);
router2.get("/rentals", adminController.getAllRentals);
router2.get("/payments", adminController.getAllPayments);
var adminRoute = router2;

// src/modules/property/property.route.ts
import { Router as Router3 } from "express";

// src/modules/property/property.service.ts
import httpStatus6 from "http-status";
var getAllProperties3 = async (req) => {
  const { page, limit, skip } = getPagination(req);
  const where = { status: "AVAILABLE" };
  if (req.query["city"]) where["city"] = { contains: req.query.city, mode: "insensitive" };
  if (req.query["categoryId"]) where["categoryId"] = req.query["categoryId"];
  if (req.query["minRent"] || req.query["maxRent"]) {
    where["rentAmount"] = {
      ...req.query["minRent"] ? { gte: Number(req.query["minRent"]) } : {},
      ...req.query["maxRent"] ? { lte: Number(req.query["maxRent"]) } : {}
    };
  }
  if (req.query["bedrooms"]) where["bedrooms"] = Number(req.query["bedrooms"]);
  const [total, properties] = await Promise.all([
    prisma.property.count({ where }),
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        landlord: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        category: true,
        reviews: {
          select: {
            rating: true
          }
        }
      }
    })
  ]);
  return {
    properties,
    meta: {
      page,
      limit,
      total
    }
  };
};
var getPropertyById = async (id) => {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      landlord: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true
        }
      },
      category: true,
      reviews: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
  if (!property) {
    throw new AppError("Property not found", httpStatus6.NOT_FOUND);
  }
  return property;
};
var createProperty = async (data, landlordId) => {
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId }
  });
  if (!category) {
    throw new AppError("Category not found", httpStatus6.NOT_FOUND);
  }
  const property = await prisma.property.create({
    data: {
      ...data,
      landlordId,
      amenities: data.amenities ?? [],
      images: data.images ?? []
    },
    include: {
      landlord: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      category: true
    }
  });
  return property;
};
var updateProperty = async (id, data, landlordId) => {
  const property = await prisma.property.findUnique({
    where: { id }
  });
  if (!property) {
    throw new AppError("Property not found", httpStatus6.NOT_FOUND);
  }
  if (property.landlordId !== landlordId) {
    throw new AppError("You are not authorized to update this property", httpStatus6.FORBIDDEN);
  }
  if (data.categoryId) {
    const category = await prisma.category.findUnique({
      where: { id: data.categoryId }
    });
    if (!category) {
      throw new AppError("Category not found", httpStatus6.NOT_FOUND);
    }
  }
  const updatedProperty = await prisma.property.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      address: data.address,
      city: data.city,
      district: data.district,
      rentAmount: data.rentAmount !== void 0 ? Number(data.rentAmount) : void 0,
      bedrooms: data.bedrooms !== void 0 ? Number(data.bedrooms) : void 0,
      bathrooms: data.bathrooms !== void 0 ? Number(data.bathrooms) : void 0,
      area: data.area !== void 0 ? data.area ? Number(data.area) : null : void 0,
      amenities: data.amenities,
      images: data.images,
      categoryId: data.categoryId
    },
    include: {
      landlord: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      category: true
    }
  });
  return updatedProperty;
};
var deleteProperty = async (id, landlordId) => {
  const property = await prisma.property.findUnique({
    where: { id }
  });
  if (!property) {
    throw new AppError("Property not found", httpStatus6.NOT_FOUND);
  }
  if (property.landlordId !== landlordId) {
    throw new AppError("You are not authorized to delete this property", httpStatus6.FORBIDDEN);
  }
  const activeRentalCount = await prisma.rentalRequests.count({
    where: {
      propertyId: id,
      status: { in: ["PENDING", "APPROVED", "ACTIVE"] }
    }
  });
  if (activeRentalCount > 0) {
    throw new AppError(
      "Cannot delete a property with pending, approved, or active rental requests.",
      httpStatus6.CONFLICT
    );
  }
  const deletedProperty = await prisma.property.delete({
    where: { id }
  });
  return deletedProperty;
};
var updatePropertyStatus = async (id, status, landlordId) => {
  const property = await prisma.property.findUnique({
    where: { id }
  });
  if (!property) {
    throw new AppError("Property not found", httpStatus6.NOT_FOUND);
  }
  if (property.landlordId !== landlordId) {
    throw new AppError("You are not authorized to update this property status", httpStatus6.FORBIDDEN);
  }
  const updatedProperty = await prisma.property.update({
    where: { id },
    data: { status },
    include: {
      landlord: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      category: true
    }
  });
  return updatedProperty;
};
var propertyService = {
  getAllProperties: getAllProperties3,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
  updatePropertyStatus
};

// src/modules/property/property.controller.ts
import httpStatus7 from "http-status";
var getAllProperties4 = catchAsync(
  async (req, res, next) => {
    const properties = await propertyService.getAllProperties(req);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus7.OK,
      message: "Properties fetched successfully",
      data: properties
    });
  }
);
var getPropertyById2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const property = await propertyService.getPropertyById(id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus7.OK,
      message: "Property fetched successfully",
      data: property
    });
  }
);
var createProperty2 = catchAsync(
  async (req, res, next) => {
    const property = await propertyService.createProperty(
      req.body,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus7.CREATED,
      message: "Property created successfully",
      data: property
    });
  }
);
var updateProperty2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const property = await propertyService.updateProperty(
      id,
      req.body,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus7.OK,
      message: "Property updated successfully",
      data: property
    });
  }
);
var deleteProperty2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const property = await propertyService.deleteProperty(
      id,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus7.OK,
      message: "Property deleted successfully",
      data: property
    });
  }
);
var updatePropertyStatus2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const property = await propertyService.updatePropertyStatus(
      id,
      req.body.status,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus7.OK,
      message: "Property status updated successfully",
      data: property
    });
  }
);
var propertyController = {
  getAllProperties: getAllProperties4,
  getPropertyById: getPropertyById2,
  createProperty: createProperty2,
  updateProperty: updateProperty2,
  deleteProperty: deleteProperty2,
  updatePropertyStatus: updatePropertyStatus2
};

// src/modules/property/property.route.ts
import { UserRole as UserRole3 } from "@prisma/client";
var router3 = Router3();
router3.get("/", propertyController.getAllProperties);
router3.get("/:id", propertyController.getPropertyById);
router3.post("/", auth(UserRole3.LANDLORD), propertyController.createProperty);
router3.patch("/:id", auth(UserRole3.LANDLORD), propertyController.updateProperty);
router3.delete("/:id", auth(UserRole3.LANDLORD), propertyController.deleteProperty);
router3.patch("/:id/status", auth(UserRole3.LANDLORD), propertyController.updatePropertyStatus);
var propertyRoute = router3;

// src/modules/category/category.route.ts
import { Router as Router4 } from "express";

// src/modules/category/category.service.ts
import httpStatus8 from "http-status";
var getAllCategories = async () => {
  return prisma.category.findMany({
    orderBy: {
      name: "asc"
    }
  });
};
var getCategoryById = async (id) => {
  const category = await prisma.category.findUnique({
    where: {
      id
    }
  });
  if (!category) throw new AppError("This category does not exist.", httpStatus8.NOT_FOUND);
  return category;
};
var createCategory = async (data) => {
  return prisma.category.create({ data });
};
var updateCategory = async (id, data) => {
  const category = await prisma.category.findUnique({
    where: {
      id
    }
  });
  if (!category) throw new AppError("This category does not exist.", httpStatus8.NOT_FOUND);
  return prisma.category.update({
    where: { id },
    data
  });
};
var deleteCategory = async (id) => {
  const category = await prisma.category.findUnique({
    where: {
      id
    }
  });
  if (!category) throw new AppError("This category does not exist.", httpStatus8.NOT_FOUND);
  return prisma.category.delete({
    where: { id }
  });
};
var categoryService = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};

// src/modules/category/category.controller.ts
import httpStatus9 from "http-status";
var getAllCategories2 = catchAsync(
  async (req, res, next) => {
    const categories = await categoryService.getAllCategories();
    sendResponse(res, {
      success: true,
      statusCode: httpStatus9.OK,
      message: "Categories fetched successfully",
      data: categories
    });
  }
);
var getCategoryById2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const category = await categoryService.getCategoryById(id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus9.OK,
      message: "Category fetched successfully",
      data: category
    });
  }
);
var createCategory2 = catchAsync(
  async (req, res, next) => {
    const newCategory = await categoryService.createCategory(req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus9.OK,
      message: "Category created successfully",
      data: newCategory
    });
  }
);
var updateCategory2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const updatedCategory = await categoryService.updateCategory(id, req.body);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus9.OK,
      message: "Category updated successfully",
      data: updatedCategory
    });
  }
);
var deleteCategory2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    await categoryService.deleteCategory(id);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus9.OK,
      message: "Category deleted successfully",
      data: null
    });
  }
);
var categoryController = {
  getAllCategories: getAllCategories2,
  getCategoryById: getCategoryById2,
  createCategory: createCategory2,
  updateCategory: updateCategory2,
  deleteCategory: deleteCategory2
};

// src/modules/category/category.route.ts
var router4 = Router4();
router4.get("/", categoryController.getAllCategories);
router4.get("/:id", categoryController.getCategoryById);
router4.post("/", auth("ADMIN"), categoryController.createCategory);
router4.put("/:id", auth("ADMIN"), categoryController.updateCategory);
router4.delete("/:id", auth("ADMIN"), categoryController.deleteCategory);
var categoryRoute = router4;

// src/modules/rental/rental.route.ts
import { Router as Router5 } from "express";

// src/modules/rental/rental.controller.ts
import httpStatus11 from "http-status";

// src/modules/rental/rental.service.ts
import httpStatus10 from "http-status";
var rentalInclude = {
  tenant: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true
    }
  },
  property: {
    select: {
      id: true,
      title: true,
      address: true,
      city: true,
      rentAmount: true,
      landlordId: true,
      landlord: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    }
  },
  payments: true
};
var createRentalRequest = async (data, tenantId) => {
  const property = await prisma.property.findUnique({
    where: {
      id: data.propertyId
    }
  });
  if (!property) throw new AppError("Property not found", httpStatus10.NOT_FOUND);
  if (property.status !== "AVAILABLE") throw new AppError("This property is not available for rent", httpStatus10.BAD_REQUEST);
  const existingPropertyRequest = await prisma.rentalRequests.findFirst({
    where: {
      tenantId,
      propertyId: data.propertyId,
      status: {
        in: ["PENDING", "APPROVED", "ACTIVE"]
      }
    }
  });
  if (existingPropertyRequest) {
    throw new AppError("You have already have an active request for this property", httpStatus10.CONFLICT);
  }
  return prisma.rentalRequests.create({
    data: {
      tenantId,
      propertyId: data.propertyId,
      moveInDate: new Date(data.moveInDate),
      duration: data.duration,
      message: data.message
    },
    include: rentalInclude
  });
};
var getRentalRequests = async (userId, role, req) => {
  const { page, limit, skip } = getPagination(req);
  let where = {};
  if (role === "TENANT") {
    where = { tenantId: userId };
  } else if (role === "LANDLORD") {
    where = {
      property: { landlordId: userId }
    };
  } else if (role === "ADMIN") {
    where = {};
  }
  const [total, rentals] = await Promise.all([
    prisma.rentalRequests.count({ where }),
    prisma.rentalRequests.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: rentalInclude
    })
  ]);
  return {
    rentals,
    meta: { page, limit, total }
  };
};
var getRentalRequestById = async (userId, role, id) => {
  const rental = await prisma.rentalRequests.findUnique({
    where: {
      id
    },
    include: rentalInclude
  });
  if (!rental) throw new AppError("Rental request not found", httpStatus10.NOT_FOUND);
  const isOwner = rental.tenantId === userId || rental.property.landlordId === userId || role === "ADMIN";
  if (!isOwner) throw new AppError("You are not authorized to access this rental request", httpStatus10.FORBIDDEN);
  return rental;
};
var updateRentalStatus = async (id, status, landlordId) => {
  const rental = await prisma.rentalRequests.findUnique({
    where: {
      id
    },
    include: {
      property: true,
      tenant: true
    }
  });
  if (!rental) throw new AppError("Rental request not found", httpStatus10.NOT_FOUND);
  if (rental.property.landlordId !== landlordId)
    throw new AppError("You are not authorized to update this rental request", httpStatus10.FORBIDDEN);
  if ((status === "APPROVED" || status === "REJECTED") && rental.status !== "PENDING") {
    throw new AppError("Only pending requests can be approved or rejected", httpStatus10.BAD_REQUEST);
  }
  if (status === "COMPLETED" && rental.status !== "ACTIVE") {
    throw new AppError("Only active rentals can be marked as completed", httpStatus10.BAD_REQUEST);
  }
  if (!["APPROVED", "REJECTED", "COMPLETED"].includes(status)) {
    throw new AppError("Invalid status. Must be APPROVED/REJECTED/COMPLETED.", httpStatus10.BAD_REQUEST);
  }
  const updatedStatus = await prisma.rentalRequests.update({
    where: { id },
    data: {
      status
    },
    include: rentalInclude
  });
  return updatedStatus;
};
var rentalService = {
  createRentalRequest,
  getRentalRequests,
  getRentalRequestById,
  updateRentalStatus
};

// src/modules/rental/rental.controller.ts
var createRentalRequest2 = catchAsync(
  async (req, res, next) => {
    const rental = await rentalService.createRentalRequest(
      req.body,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus11.CREATED,
      message: "Rental request created successfully",
      data: rental
    });
  }
);
var getRentalRequests2 = catchAsync(
  async (req, res, next) => {
    const rentals = await rentalService.getRentalRequests(
      req.user.id,
      req.user.role,
      req
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus11.OK,
      message: "Rental requests fetched successfully",
      data: rentals
    });
  }
);
var getRentalRequestById2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const rental = await rentalService.getRentalRequestById(
      req.user.id,
      req.user.role,
      id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus11.OK,
      message: "Rental request fetched successfully",
      data: rental
    });
  }
);
var updateRentalStatus2 = catchAsync(
  async (req, res, next) => {
    const id = req.params["id"];
    const rental = await rentalService.updateRentalStatus(
      id,
      req.body.status,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus11.OK,
      message: "Rental status updated successfully",
      data: rental
    });
  }
);
var rentalController = {
  createRentalRequest: createRentalRequest2,
  getRentalRequests: getRentalRequests2,
  getRentalRequestById: getRentalRequestById2,
  updateRentalStatus: updateRentalStatus2
};

// src/modules/rental/rental.route.ts
var router5 = Router5();
router5.post("/", auth("TENANT"), rentalController.createRentalRequest);
router5.get("/", auth("TENANT", "LANDLORD", "ADMIN"), rentalController.getRentalRequests);
router5.get("/:id", auth("TENANT", "LANDLORD", "ADMIN"), rentalController.getRentalRequestById);
router5.patch("/:id/status", auth("LANDLORD"), rentalController.updateRentalStatus);
var rentalRoute = router5;

// src/modules/review/review.route.ts
import { Router as Router6 } from "express";

// src/modules/review/review.service.ts
import { RentalStatus } from "@prisma/client";
import httpStatus12 from "http-status";
var createReview = async (data, tenantId) => {
  if (data.rating < 1 || data.rating > 5)
    throw new AppError("Rating must be between 1 and 5", httpStatus12.BAD_REQUEST);
  const verifyRentalRequest = await prisma.rentalRequests.findUnique({
    where: {
      id: data.rentalRequestId
    }
  });
  if (!verifyRentalRequest) throw new AppError("Rental request not found.", httpStatus12.NOT_FOUND);
  if (verifyRentalRequest.tenantId !== tenantId)
    throw new AppError("You can only review your own rentals.", httpStatus12.FORBIDDEN);
  if (verifyRentalRequest.propertyId !== data.propertyId)
    throw new AppError("Property ID does not match the rental request.", httpStatus12.BAD_REQUEST);
  if (verifyRentalRequest.status !== RentalStatus.COMPLETED)
    throw new AppError("You can only review completed rentals.", httpStatus12.BAD_REQUEST);
  const existingReview = await prisma.review.findUnique({
    where: {
      rentalRequestId: data.rentalRequestId
    }
  });
  if (existingReview)
    throw new AppError("You have already reviewed this rental.", httpStatus12.CONFLICT);
  return prisma.review.create({
    data: {
      tenantId,
      propertyId: data.propertyId,
      rentalRequestId: data.rentalRequestId,
      rating: data.rating,
      comment: data.comment
    },
    include: {
      tenant: {
        select: {
          id: true,
          name: true
        }
      },
      property: {
        select: {
          id: true,
          title: true
        }
      }
    }
  });
};
var getPropertyReviews = async (propertyId) => {
  const reviews = await prisma.review.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
    include: {
      tenant: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  return reviews;
};
var reviewService = {
  createReview,
  getPropertyReviews
};

// src/modules/review/review.controller.ts
import httpStatus13 from "http-status";
var createReview2 = catchAsync(
  async (req, res, next) => {
    const review = await reviewService.createReview(
      req.body,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus13.CREATED,
      message: "Review created successfully",
      data: review
    });
  }
);
var getPropertyReviews2 = catchAsync(
  async (req, res, next) => {
    const propertyId = req.params["propertyId"];
    const reviews = await reviewService.getPropertyReviews(propertyId);
    sendResponse(res, {
      success: true,
      statusCode: httpStatus13.OK,
      message: "Reviews fetched successfully",
      data: reviews
    });
  }
);
var reviewController = {
  createReview: createReview2,
  getPropertyReviews: getPropertyReviews2
};

// src/modules/review/review.route.ts
var router6 = Router6();
router6.post("/", auth("TENANT"), reviewController.createReview);
router6.get("/property/:propertyId", reviewController.getPropertyReviews);
var reviewRoute = router6;

// src/modules/payment/payment.route.ts
import { Router as Router7 } from "express";

// src/config/stripe.ts
import Stripe from "stripe";
var stripe = new Stripe(config_default.stripe.secretKey, {
  apiVersion: "2025-02-24.acacia"
});
var stripe_default = stripe;

// src/modules/payment/payment.service.ts
var createStripePayment = async (rentalRequestId, tenantId) => {
  const rental = await prisma.rentalRequests.findUnique({
    where: { id: rentalRequestId },
    include: {
      property: { select: { title: true, rentAmount: true, landlordId: true } },
      payments: true
    }
  });
  if (!rental) throw new AppError("Rental request not found.", 404);
  if (rental.tenantId !== tenantId)
    throw new AppError("You are not authorized to pay for this request.", 403);
  if (rental.status !== "APPROVED")
    throw new AppError("Rental request must be approved before payment.", 400);
  const hasExistingPayment = rental.payments.some(
    (p) => p.status !== "FAILED"
  );
  if (hasExistingPayment)
    throw new AppError("Payment already exists for this rental request.", 409);
  const totalAmount = rental.property.rentAmount * rental.duration;
  const session = await stripe_default.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Rent: ${rental.property.title}`,
            description: `${rental.duration} month(s) rental`
          },
          unit_amount: Math.round(totalAmount * 100)
          // in cents
        },
        quantity: 1
      }
    ],
    metadata: {
      rentalRequestId,
      tenantId
    },
    success_url: `${config_default.app_url ?? "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config_default.app_url ?? "http://localhost:3000"}/payment/cancel`
  });
  try {
    const payment = await prisma.payment.create({
      data: {
        rentalRequestId,
        userId: tenantId,
        amount: totalAmount,
        provider: "STRIPE",
        status: "PENDING",
        sessionId: session.id
      }
    });
    return { sessionId: session.id, url: session.url, payment };
  } catch (err) {
    await stripe_default.checkout.sessions.expire(session.id).catch(() => {
    });
    throw err;
  }
};
var handleStripeWebhook = async (rawBody, signature) => {
  let event;
  try {
    event = stripe_default.webhooks.constructEvent(
      rawBody,
      signature,
      config_default.stripe.webhookSecret
    );
  } catch (err) {
    throw new AppError(`Invalid webhook signature: ${err.message}`, 400);
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const rentalRequestId = session.metadata?.["rentalRequestId"];
    if (rentalRequestId) {
      await prisma.$transaction([
        prisma.payment.update({
          where: { rentalRequestId },
          data: {
            status: "COMPLETED",
            transactionId: session.payment_intent,
            paidAt: /* @__PURE__ */ new Date()
          }
        }),
        prisma.rentalRequests.update({
          where: { id: rentalRequestId },
          data: { status: "ACTIVE" }
        })
      ]);
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object;
    const rentalRequestId = session.metadata?.["rentalRequestId"];
    if (rentalRequestId) {
      await prisma.payment.update({
        where: { rentalRequestId },
        data: { status: "FAILED" }
      });
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    const sessionList = await stripe_default.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 1
    });
    const session = sessionList.data[0];
    const rentalRequestId = session?.metadata?.["rentalRequestId"];
    if (rentalRequestId) {
      await prisma.payment.update({
        where: { rentalRequestId },
        data: { status: "FAILED" }
      });
    }
  }
};
var confirmPayment = async (sessionId, tenantId) => {
  const session = await stripe_default.checkout.sessions.retrieve(sessionId);
  if (!session) throw new AppError("Payment session not found.", 404);
  const rentalRequestId = session.metadata?.["rentalRequestId"];
  if (!rentalRequestId) throw new AppError("Invalid session metadata.", 400);
  const existingPayment = await prisma.payment.findUnique({
    where: { rentalRequestId }
  });
  if (existingPayment?.status === "COMPLETED") {
    return existingPayment;
  }
  if (session.payment_status !== "paid") {
    throw new AppError("Payment has not been completed.", 400);
  }
  const [payment] = await prisma.$transaction([
    prisma.payment.update({
      where: { rentalRequestId },
      data: {
        status: "COMPLETED",
        transactionId: session.payment_intent,
        paidAt: /* @__PURE__ */ new Date()
      }
    }),
    prisma.rentalRequests.update({
      where: { id: rentalRequestId },
      data: { status: "ACTIVE" }
    })
  ]);
  return payment;
};
var getPayments = async (userId, role, req) => {
  const { page, limit, skip } = getPagination(req);
  let where = {};
  if (role === "ADMIN") {
    where = {};
  } else if (role === "LANDLORD") {
    where = { rentalRequest: { property: { landlordId: userId } } };
  } else {
    where = { userId };
  }
  const [total, payments] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        rentalRequest: {
          include: {
            property: { select: { id: true, title: true, rentAmount: true } }
          }
        }
      }
    })
  ]);
  return { payments, meta: { total, page, limit } };
};
var getPaymentById = async (id, userId, role) => {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      rentalRequest: {
        include: {
          property: { select: { id: true, title: true } },
          tenant: { select: { id: true, name: true, email: true } }
        }
      }
    }
  });
  if (!payment) throw new AppError("Payment not found.", 404);
  if (payment.userId !== userId && role !== "ADMIN")
    throw new AppError("You are not authorized to view this payment.", 403);
  return payment;
};

// src/modules/payment/payment.controller.ts
import httpStatus14 from "http-status";
var createPayment = catchAsync(
  async (req, res, next) => {
    const result = await createStripePayment(
      req.body.rentalRequestId,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus14.CREATED,
      message: "Payment session created successfully",
      data: result
    });
  }
);
var stripeWebhook = async (req, res, next) => {
  try {
    const sig = req.headers["stripe-signature"];
    await handleStripeWebhook(req.body, sig);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
};
var confirmPayment2 = catchAsync(
  async (req, res, _next) => {
    const payment = await confirmPayment(
      req.body.sessionId,
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus14.OK,
      message: "Payment confirmed successfully",
      data: payment
    });
  }
);
var getPayments2 = catchAsync(
  async (req, res, _next) => {
    const { payments, meta } = await getPayments(
      req.user.id,
      req.user.role,
      req
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus14.OK,
      message: "Payments retrieved successfully",
      data: payments,
      meta
    });
  }
);
var getPaymentById2 = catchAsync(
  async (req, res, _next) => {
    const id = req.params["id"];
    const payment = await getPaymentById(
      id,
      req.user.id,
      req.user.role
    );
    sendResponse(res, {
      success: true,
      statusCode: httpStatus14.OK,
      message: "Payment retrieved successfully",
      data: payment
    });
  }
);
var paymentController = {
  createPayment,
  stripeWebhook,
  confirmPayment: confirmPayment2,
  getPayments: getPayments2,
  getPaymentById: getPaymentById2
};

// src/modules/payment/payment.route.ts
var router7 = Router7();
router7.post("/create", auth("TENANT"), paymentController.createPayment);
router7.post("/webhook", paymentController.stripeWebhook);
router7.post("/confirm", auth("TENANT"), paymentController.confirmPayment);
router7.get("/", auth("TENANT", "LANDLORD", "ADMIN"), paymentController.getPayments);
router7.get("/:id", auth("TENANT", "LANDLORD", "ADMIN"), paymentController.getPaymentById);
var paymentRoute = router7;

// src/middlewares/globalErrorHandler.ts
import httpStatus15 from "http-status";
import { Prisma } from "@prisma/client";
var globalErrorHandler = (err, req, res, next) => {
  let statusCode = httpStatus15.INTERNAL_SERVER_ERROR;
  let errorMessage = err.message || "Something went wrong!!!";
  let errorName = err.name || "Error.";
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
  } else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = httpStatus15.BAD_REQUEST;
    errorMessage = "You have provided incorrect field type or missing fields";
  } else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      statusCode = httpStatus15.BAD_REQUEST;
      errorMessage = "Duplicate key error!";
    } else if (err.code === "P2003") {
      statusCode = httpStatus15.BAD_REQUEST;
      errorMessage = "Foreign key constraint error!";
    } else if (err.code === "P2025") {
      statusCode = httpStatus15.BAD_REQUEST;
      errorMessage = "An operation failed because it depends on one or more records that were required but not found.";
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    if (err.errorCode === "P1000") {
      statusCode = httpStatus15.UNAUTHORIZED;
      errorMessage = "Authentication failed against database server. Please check your credentials";
    } else if (err.errorCode === "P1001") {
      statusCode = httpStatus15.UNAUTHORIZED;
      errorMessage = "Can't reach the Database server";
    }
  } else if (err instanceof Prisma.PrismaClientUnknownRequestError) {
    statusCode = httpStatus15.INTERNAL_SERVER_ERROR;
    errorMessage = "Error occurred during query execution";
  }
  res.status(statusCode).json({
    success: false,
    statusCode,
    name: errorName,
    message: errorMessage,
    error: process.env.NODE_ENV === "development" ? err.stack : void 0
  });
};

// src/app.ts
var app = express();
app.use("/api/payments/webhook", express.raw({ type: "application/json" }));
app.use(
  cors({
    origin: config_default.app_url || "http://localhost:3000",
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get("/", (req, res) => {
  res.send("Welcome to RentNest API");
});
app.use("/api/auth", authRoute);
app.use("/api/property", propertyRoute);
app.use("/api/categories", categoryRoute);
app.use("/api/rentals", rentalRoute);
app.use("/api/reviews", reviewRoute);
app.use("/api/admin", adminRoute);
app.use("/api/payments", paymentRoute);
app.use((req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});
app.use(globalErrorHandler);
var app_default = app;

// src/server.ts
var PORT = config_default.port;
async function main() {
  try {
    await prisma.$connect();
    console.log("Database Connected Successfully");
    app_default.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting the server", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}
main();
//# sourceMappingURL=server.js.map