import { SignOptions } from "jsonwebtoken";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { jwtUtils } from "../../utils/jwt";
import { ILogin, IRegister } from "./auth.interface";
import bcrypt from "bcrypt";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  profileImage: true,
  createdAt: true,
} as const;

const register = async (data: IRegister) => {
  if (!["TENANT", "ADMIN", "LANDLORD"].includes(data.role)) {
    throw new AppError("Invalid role. Must be TENANT or LANDLORD.", httpStatus.BAD_REQUEST);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: data.email,
    },
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
      phone: data.phone,
      profileImage: data.profileImage,
    },
    select: userSelect,
  });

  return user;
};

const login = async (data: ILogin) => {
  const user = await prisma.user.findUnique({
    where: { email: data.email },
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
    role: user.role,
  };

  const accessToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_access_secret,
    config.jwt_access_expires_in as SignOptions,
  );
  const refreshToken = jwtUtils.createToken(
    jwtPayload,
    config.jwt_refresh_secret,
    config.jwt_refresh_expires_in as SignOptions,
  );

  return { user, accessToken, refreshToken };
};

const myProfile = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    // Explicitly select fields to ensure password hash is never returned
    select: userSelect,
  });

  return user;
};

export const authService = {
  register,
  login,
  myProfile,
};
