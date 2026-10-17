/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as deliveries from "../deliveries.js";
import type * as disputes from "../disputes.js";
import type * as files from "../files.js";
import type * as help from "../help.js";
import type * as http from "../http.js";
import type * as lib_accounts from "../lib/accounts.js";
import type * as lib_authErrors from "../lib/authErrors.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_firebase from "../lib/firebase.js";
import type * as lib_ledger from "../lib/ledger.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_validate from "../lib/validate.js";
import type * as orders from "../orders.js";
import type * as seed from "../seed.js";
import type * as shops from "../shops.js";
import type * as users from "../users.js";
import type * as wallet from "../wallet.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  deliveries: typeof deliveries;
  disputes: typeof disputes;
  files: typeof files;
  help: typeof help;
  http: typeof http;
  "lib/accounts": typeof lib_accounts;
  "lib/authErrors": typeof lib_authErrors;
  "lib/constants": typeof lib_constants;
  "lib/firebase": typeof lib_firebase;
  "lib/ledger": typeof lib_ledger;
  "lib/uploads": typeof lib_uploads;
  "lib/users": typeof lib_users;
  "lib/validate": typeof lib_validate;
  orders: typeof orders;
  seed: typeof seed;
  shops: typeof shops;
  users: typeof users;
  wallet: typeof wallet;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
