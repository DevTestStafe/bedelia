import type { Role } from "./roles.js";

export type AuthUser = {
  uid: string;
  username: string;
  roles: Role[];
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}
