
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model DeviceUser
 * 
 */
export type DeviceUser = $Result.DefaultSelection<Prisma.$DeviceUserPayload>
/**
 * Model XtreamServer
 * 
 */
export type XtreamServer = $Result.DefaultSelection<Prisma.$XtreamServerPayload>
/**
 * Model License
 * 
 */
export type License = $Result.DefaultSelection<Prisma.$LicensePayload>
/**
 * Model AuditLog
 * 
 */
export type AuditLog = $Result.DefaultSelection<Prisma.$AuditLogPayload>
/**
 * Model Session
 * 
 */
export type Session = $Result.DefaultSelection<Prisma.$SessionPayload>
/**
 * Model DeviceToken
 * 
 */
export type DeviceToken = $Result.DefaultSelection<Prisma.$DeviceTokenPayload>
/**
 * Model DeviceBlacklist
 * 
 */
export type DeviceBlacklist = $Result.DefaultSelection<Prisma.$DeviceBlacklistPayload>
/**
 * Model PlaybackActivity
 * 
 */
export type PlaybackActivity = $Result.DefaultSelection<Prisma.$PlaybackActivityPayload>
/**
 * Model ResumeProgress
 * 
 */
export type ResumeProgress = $Result.DefaultSelection<Prisma.$ResumeProgressPayload>
/**
 * Model ParentalConfig
 * 
 */
export type ParentalConfig = $Result.DefaultSelection<Prisma.$ParentalConfigPayload>
/**
 * Model ThemeConfig
 * 
 */
export type ThemeConfig = $Result.DefaultSelection<Prisma.$ThemeConfigPayload>
/**
 * Model Profile
 * 
 */
export type Profile = $Result.DefaultSelection<Prisma.$ProfilePayload>
/**
 * Model TmdbMetadata
 * 
 */
export type TmdbMetadata = $Result.DefaultSelection<Prisma.$TmdbMetadataPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const UserRole: {
  ADMIN: 'ADMIN',
  RESELLER: 'RESELLER',
  USER: 'USER'
};

export type UserRole = (typeof UserRole)[keyof typeof UserRole]


export const LicenseStatus: {
  ACTIVE: 'ACTIVE',
  EXPIRED: 'EXPIRED',
  DISABLED: 'DISABLED',
  BLOCKED: 'BLOCKED'
};

export type LicenseStatus = (typeof LicenseStatus)[keyof typeof LicenseStatus]


export const AuditAction: {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  ASSIGN: 'ASSIGN',
  BLOCK: 'BLOCK',
  RESTORE: 'RESTORE'
};

export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction]


export const LicensePlan: {
  TRIAL: 'TRIAL',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
  LIFETIME: 'LIFETIME'
};

export type LicensePlan = (typeof LicensePlan)[keyof typeof LicensePlan]


export const Platform: {
  ANDROID_TV: 'ANDROID_TV',
  ANDROID_MOBILE: 'ANDROID_MOBILE',
  FIRE_TV: 'FIRE_TV',
  WEBOS: 'WEBOS',
  TIZEN: 'TIZEN',
  IOS: 'IOS',
  BROWSER: 'BROWSER',
  UNKNOWN: 'UNKNOWN'
};

export type Platform = (typeof Platform)[keyof typeof Platform]


export const BlacklistReason: {
  FRAUD: 'FRAUD',
  ABUSE: 'ABUSE',
  TOS_VIOLATION: 'TOS_VIOLATION',
  ADMIN_BAN: 'ADMIN_BAN'
};

export type BlacklistReason = (typeof BlacklistReason)[keyof typeof BlacklistReason]


export const ConfigScope: {
  GLOBAL: 'GLOBAL',
  RESELLER: 'RESELLER',
  USER: 'USER'
};

export type ConfigScope = (typeof ConfigScope)[keyof typeof ConfigScope]


export const AuthProvider: {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE'
};

export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider]

}

export type UserRole = $Enums.UserRole

export const UserRole: typeof $Enums.UserRole

export type LicenseStatus = $Enums.LicenseStatus

export const LicenseStatus: typeof $Enums.LicenseStatus

export type AuditAction = $Enums.AuditAction

export const AuditAction: typeof $Enums.AuditAction

export type LicensePlan = $Enums.LicensePlan

export const LicensePlan: typeof $Enums.LicensePlan

export type Platform = $Enums.Platform

export const Platform: typeof $Enums.Platform

export type BlacklistReason = $Enums.BlacklistReason

export const BlacklistReason: typeof $Enums.BlacklistReason

export type ConfigScope = $Enums.ConfigScope

export const ConfigScope: typeof $Enums.ConfigScope

export type AuthProvider = $Enums.AuthProvider

export const AuthProvider: typeof $Enums.AuthProvider

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.deviceUser`: Exposes CRUD operations for the **DeviceUser** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DeviceUsers
    * const deviceUsers = await prisma.deviceUser.findMany()
    * ```
    */
  get deviceUser(): Prisma.DeviceUserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.xtreamServer`: Exposes CRUD operations for the **XtreamServer** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more XtreamServers
    * const xtreamServers = await prisma.xtreamServer.findMany()
    * ```
    */
  get xtreamServer(): Prisma.XtreamServerDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.license`: Exposes CRUD operations for the **License** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Licenses
    * const licenses = await prisma.license.findMany()
    * ```
    */
  get license(): Prisma.LicenseDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.auditLog`: Exposes CRUD operations for the **AuditLog** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more AuditLogs
    * const auditLogs = await prisma.auditLog.findMany()
    * ```
    */
  get auditLog(): Prisma.AuditLogDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.session`: Exposes CRUD operations for the **Session** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Sessions
    * const sessions = await prisma.session.findMany()
    * ```
    */
  get session(): Prisma.SessionDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.deviceToken`: Exposes CRUD operations for the **DeviceToken** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DeviceTokens
    * const deviceTokens = await prisma.deviceToken.findMany()
    * ```
    */
  get deviceToken(): Prisma.DeviceTokenDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.deviceBlacklist`: Exposes CRUD operations for the **DeviceBlacklist** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more DeviceBlacklists
    * const deviceBlacklists = await prisma.deviceBlacklist.findMany()
    * ```
    */
  get deviceBlacklist(): Prisma.DeviceBlacklistDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.playbackActivity`: Exposes CRUD operations for the **PlaybackActivity** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more PlaybackActivities
    * const playbackActivities = await prisma.playbackActivity.findMany()
    * ```
    */
  get playbackActivity(): Prisma.PlaybackActivityDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.resumeProgress`: Exposes CRUD operations for the **ResumeProgress** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ResumeProgresses
    * const resumeProgresses = await prisma.resumeProgress.findMany()
    * ```
    */
  get resumeProgress(): Prisma.ResumeProgressDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.parentalConfig`: Exposes CRUD operations for the **ParentalConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ParentalConfigs
    * const parentalConfigs = await prisma.parentalConfig.findMany()
    * ```
    */
  get parentalConfig(): Prisma.ParentalConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.themeConfig`: Exposes CRUD operations for the **ThemeConfig** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more ThemeConfigs
    * const themeConfigs = await prisma.themeConfig.findMany()
    * ```
    */
  get themeConfig(): Prisma.ThemeConfigDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.profile`: Exposes CRUD operations for the **Profile** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Profiles
    * const profiles = await prisma.profile.findMany()
    * ```
    */
  get profile(): Prisma.ProfileDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.tmdbMetadata`: Exposes CRUD operations for the **TmdbMetadata** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more TmdbMetadata
    * const tmdbMetadata = await prisma.tmdbMetadata.findMany()
    * ```
    */
  get tmdbMetadata(): Prisma.TmdbMetadataDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.0
   * Query Engine version: 2ba551f319ab1df4bc874a89965d8b3641056773
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    DeviceUser: 'DeviceUser',
    XtreamServer: 'XtreamServer',
    License: 'License',
    AuditLog: 'AuditLog',
    Session: 'Session',
    DeviceToken: 'DeviceToken',
    DeviceBlacklist: 'DeviceBlacklist',
    PlaybackActivity: 'PlaybackActivity',
    ResumeProgress: 'ResumeProgress',
    ParentalConfig: 'ParentalConfig',
    ThemeConfig: 'ThemeConfig',
    Profile: 'Profile',
    TmdbMetadata: 'TmdbMetadata'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "deviceUser" | "xtreamServer" | "license" | "auditLog" | "session" | "deviceToken" | "deviceBlacklist" | "playbackActivity" | "resumeProgress" | "parentalConfig" | "themeConfig" | "profile" | "tmdbMetadata"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      DeviceUser: {
        payload: Prisma.$DeviceUserPayload<ExtArgs>
        fields: Prisma.DeviceUserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DeviceUserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DeviceUserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>
          }
          findFirst: {
            args: Prisma.DeviceUserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DeviceUserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>
          }
          findMany: {
            args: Prisma.DeviceUserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>[]
          }
          create: {
            args: Prisma.DeviceUserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>
          }
          createMany: {
            args: Prisma.DeviceUserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.DeviceUserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>
          }
          update: {
            args: Prisma.DeviceUserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>
          }
          deleteMany: {
            args: Prisma.DeviceUserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DeviceUserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.DeviceUserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceUserPayload>
          }
          aggregate: {
            args: Prisma.DeviceUserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDeviceUser>
          }
          groupBy: {
            args: Prisma.DeviceUserGroupByArgs<ExtArgs>
            result: $Utils.Optional<DeviceUserGroupByOutputType>[]
          }
          count: {
            args: Prisma.DeviceUserCountArgs<ExtArgs>
            result: $Utils.Optional<DeviceUserCountAggregateOutputType> | number
          }
        }
      }
      XtreamServer: {
        payload: Prisma.$XtreamServerPayload<ExtArgs>
        fields: Prisma.XtreamServerFieldRefs
        operations: {
          findUnique: {
            args: Prisma.XtreamServerFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.XtreamServerFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>
          }
          findFirst: {
            args: Prisma.XtreamServerFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.XtreamServerFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>
          }
          findMany: {
            args: Prisma.XtreamServerFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>[]
          }
          create: {
            args: Prisma.XtreamServerCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>
          }
          createMany: {
            args: Prisma.XtreamServerCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.XtreamServerDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>
          }
          update: {
            args: Prisma.XtreamServerUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>
          }
          deleteMany: {
            args: Prisma.XtreamServerDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.XtreamServerUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.XtreamServerUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$XtreamServerPayload>
          }
          aggregate: {
            args: Prisma.XtreamServerAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateXtreamServer>
          }
          groupBy: {
            args: Prisma.XtreamServerGroupByArgs<ExtArgs>
            result: $Utils.Optional<XtreamServerGroupByOutputType>[]
          }
          count: {
            args: Prisma.XtreamServerCountArgs<ExtArgs>
            result: $Utils.Optional<XtreamServerCountAggregateOutputType> | number
          }
        }
      }
      License: {
        payload: Prisma.$LicensePayload<ExtArgs>
        fields: Prisma.LicenseFieldRefs
        operations: {
          findUnique: {
            args: Prisma.LicenseFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.LicenseFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>
          }
          findFirst: {
            args: Prisma.LicenseFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.LicenseFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>
          }
          findMany: {
            args: Prisma.LicenseFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>[]
          }
          create: {
            args: Prisma.LicenseCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>
          }
          createMany: {
            args: Prisma.LicenseCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.LicenseDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>
          }
          update: {
            args: Prisma.LicenseUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>
          }
          deleteMany: {
            args: Prisma.LicenseDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.LicenseUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.LicenseUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$LicensePayload>
          }
          aggregate: {
            args: Prisma.LicenseAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateLicense>
          }
          groupBy: {
            args: Prisma.LicenseGroupByArgs<ExtArgs>
            result: $Utils.Optional<LicenseGroupByOutputType>[]
          }
          count: {
            args: Prisma.LicenseCountArgs<ExtArgs>
            result: $Utils.Optional<LicenseCountAggregateOutputType> | number
          }
        }
      }
      AuditLog: {
        payload: Prisma.$AuditLogPayload<ExtArgs>
        fields: Prisma.AuditLogFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AuditLogFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AuditLogFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findFirst: {
            args: Prisma.AuditLogFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AuditLogFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          findMany: {
            args: Prisma.AuditLogFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>[]
          }
          create: {
            args: Prisma.AuditLogCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          createMany: {
            args: Prisma.AuditLogCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.AuditLogDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          update: {
            args: Prisma.AuditLogUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          deleteMany: {
            args: Prisma.AuditLogDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AuditLogUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.AuditLogUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AuditLogPayload>
          }
          aggregate: {
            args: Prisma.AuditLogAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAuditLog>
          }
          groupBy: {
            args: Prisma.AuditLogGroupByArgs<ExtArgs>
            result: $Utils.Optional<AuditLogGroupByOutputType>[]
          }
          count: {
            args: Prisma.AuditLogCountArgs<ExtArgs>
            result: $Utils.Optional<AuditLogCountAggregateOutputType> | number
          }
        }
      }
      Session: {
        payload: Prisma.$SessionPayload<ExtArgs>
        fields: Prisma.SessionFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SessionFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SessionFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findFirst: {
            args: Prisma.SessionFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SessionFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          findMany: {
            args: Prisma.SessionFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>[]
          }
          create: {
            args: Prisma.SessionCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          createMany: {
            args: Prisma.SessionCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.SessionDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          update: {
            args: Prisma.SessionUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          deleteMany: {
            args: Prisma.SessionDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SessionUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.SessionUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SessionPayload>
          }
          aggregate: {
            args: Prisma.SessionAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSession>
          }
          groupBy: {
            args: Prisma.SessionGroupByArgs<ExtArgs>
            result: $Utils.Optional<SessionGroupByOutputType>[]
          }
          count: {
            args: Prisma.SessionCountArgs<ExtArgs>
            result: $Utils.Optional<SessionCountAggregateOutputType> | number
          }
        }
      }
      DeviceToken: {
        payload: Prisma.$DeviceTokenPayload<ExtArgs>
        fields: Prisma.DeviceTokenFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DeviceTokenFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DeviceTokenFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>
          }
          findFirst: {
            args: Prisma.DeviceTokenFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DeviceTokenFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>
          }
          findMany: {
            args: Prisma.DeviceTokenFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>[]
          }
          create: {
            args: Prisma.DeviceTokenCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>
          }
          createMany: {
            args: Prisma.DeviceTokenCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.DeviceTokenDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>
          }
          update: {
            args: Prisma.DeviceTokenUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>
          }
          deleteMany: {
            args: Prisma.DeviceTokenDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DeviceTokenUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.DeviceTokenUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceTokenPayload>
          }
          aggregate: {
            args: Prisma.DeviceTokenAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDeviceToken>
          }
          groupBy: {
            args: Prisma.DeviceTokenGroupByArgs<ExtArgs>
            result: $Utils.Optional<DeviceTokenGroupByOutputType>[]
          }
          count: {
            args: Prisma.DeviceTokenCountArgs<ExtArgs>
            result: $Utils.Optional<DeviceTokenCountAggregateOutputType> | number
          }
        }
      }
      DeviceBlacklist: {
        payload: Prisma.$DeviceBlacklistPayload<ExtArgs>
        fields: Prisma.DeviceBlacklistFieldRefs
        operations: {
          findUnique: {
            args: Prisma.DeviceBlacklistFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.DeviceBlacklistFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>
          }
          findFirst: {
            args: Prisma.DeviceBlacklistFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.DeviceBlacklistFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>
          }
          findMany: {
            args: Prisma.DeviceBlacklistFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>[]
          }
          create: {
            args: Prisma.DeviceBlacklistCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>
          }
          createMany: {
            args: Prisma.DeviceBlacklistCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.DeviceBlacklistDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>
          }
          update: {
            args: Prisma.DeviceBlacklistUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>
          }
          deleteMany: {
            args: Prisma.DeviceBlacklistDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.DeviceBlacklistUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.DeviceBlacklistUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$DeviceBlacklistPayload>
          }
          aggregate: {
            args: Prisma.DeviceBlacklistAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateDeviceBlacklist>
          }
          groupBy: {
            args: Prisma.DeviceBlacklistGroupByArgs<ExtArgs>
            result: $Utils.Optional<DeviceBlacklistGroupByOutputType>[]
          }
          count: {
            args: Prisma.DeviceBlacklistCountArgs<ExtArgs>
            result: $Utils.Optional<DeviceBlacklistCountAggregateOutputType> | number
          }
        }
      }
      PlaybackActivity: {
        payload: Prisma.$PlaybackActivityPayload<ExtArgs>
        fields: Prisma.PlaybackActivityFieldRefs
        operations: {
          findUnique: {
            args: Prisma.PlaybackActivityFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.PlaybackActivityFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>
          }
          findFirst: {
            args: Prisma.PlaybackActivityFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.PlaybackActivityFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>
          }
          findMany: {
            args: Prisma.PlaybackActivityFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>[]
          }
          create: {
            args: Prisma.PlaybackActivityCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>
          }
          createMany: {
            args: Prisma.PlaybackActivityCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.PlaybackActivityDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>
          }
          update: {
            args: Prisma.PlaybackActivityUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>
          }
          deleteMany: {
            args: Prisma.PlaybackActivityDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.PlaybackActivityUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.PlaybackActivityUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$PlaybackActivityPayload>
          }
          aggregate: {
            args: Prisma.PlaybackActivityAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregatePlaybackActivity>
          }
          groupBy: {
            args: Prisma.PlaybackActivityGroupByArgs<ExtArgs>
            result: $Utils.Optional<PlaybackActivityGroupByOutputType>[]
          }
          count: {
            args: Prisma.PlaybackActivityCountArgs<ExtArgs>
            result: $Utils.Optional<PlaybackActivityCountAggregateOutputType> | number
          }
        }
      }
      ResumeProgress: {
        payload: Prisma.$ResumeProgressPayload<ExtArgs>
        fields: Prisma.ResumeProgressFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ResumeProgressFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ResumeProgressFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>
          }
          findFirst: {
            args: Prisma.ResumeProgressFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ResumeProgressFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>
          }
          findMany: {
            args: Prisma.ResumeProgressFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>[]
          }
          create: {
            args: Prisma.ResumeProgressCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>
          }
          createMany: {
            args: Prisma.ResumeProgressCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ResumeProgressDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>
          }
          update: {
            args: Prisma.ResumeProgressUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>
          }
          deleteMany: {
            args: Prisma.ResumeProgressDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ResumeProgressUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ResumeProgressUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ResumeProgressPayload>
          }
          aggregate: {
            args: Prisma.ResumeProgressAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateResumeProgress>
          }
          groupBy: {
            args: Prisma.ResumeProgressGroupByArgs<ExtArgs>
            result: $Utils.Optional<ResumeProgressGroupByOutputType>[]
          }
          count: {
            args: Prisma.ResumeProgressCountArgs<ExtArgs>
            result: $Utils.Optional<ResumeProgressCountAggregateOutputType> | number
          }
        }
      }
      ParentalConfig: {
        payload: Prisma.$ParentalConfigPayload<ExtArgs>
        fields: Prisma.ParentalConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ParentalConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ParentalConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>
          }
          findFirst: {
            args: Prisma.ParentalConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ParentalConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>
          }
          findMany: {
            args: Prisma.ParentalConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>[]
          }
          create: {
            args: Prisma.ParentalConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>
          }
          createMany: {
            args: Prisma.ParentalConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ParentalConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>
          }
          update: {
            args: Prisma.ParentalConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>
          }
          deleteMany: {
            args: Prisma.ParentalConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ParentalConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ParentalConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ParentalConfigPayload>
          }
          aggregate: {
            args: Prisma.ParentalConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateParentalConfig>
          }
          groupBy: {
            args: Prisma.ParentalConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<ParentalConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.ParentalConfigCountArgs<ExtArgs>
            result: $Utils.Optional<ParentalConfigCountAggregateOutputType> | number
          }
        }
      }
      ThemeConfig: {
        payload: Prisma.$ThemeConfigPayload<ExtArgs>
        fields: Prisma.ThemeConfigFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ThemeConfigFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ThemeConfigFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>
          }
          findFirst: {
            args: Prisma.ThemeConfigFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ThemeConfigFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>
          }
          findMany: {
            args: Prisma.ThemeConfigFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>[]
          }
          create: {
            args: Prisma.ThemeConfigCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>
          }
          createMany: {
            args: Prisma.ThemeConfigCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ThemeConfigDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>
          }
          update: {
            args: Prisma.ThemeConfigUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>
          }
          deleteMany: {
            args: Prisma.ThemeConfigDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ThemeConfigUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ThemeConfigUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ThemeConfigPayload>
          }
          aggregate: {
            args: Prisma.ThemeConfigAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateThemeConfig>
          }
          groupBy: {
            args: Prisma.ThemeConfigGroupByArgs<ExtArgs>
            result: $Utils.Optional<ThemeConfigGroupByOutputType>[]
          }
          count: {
            args: Prisma.ThemeConfigCountArgs<ExtArgs>
            result: $Utils.Optional<ThemeConfigCountAggregateOutputType> | number
          }
        }
      }
      Profile: {
        payload: Prisma.$ProfilePayload<ExtArgs>
        fields: Prisma.ProfileFieldRefs
        operations: {
          findUnique: {
            args: Prisma.ProfileFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.ProfileFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          findFirst: {
            args: Prisma.ProfileFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.ProfileFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          findMany: {
            args: Prisma.ProfileFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>[]
          }
          create: {
            args: Prisma.ProfileCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          createMany: {
            args: Prisma.ProfileCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.ProfileDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          update: {
            args: Prisma.ProfileUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          deleteMany: {
            args: Prisma.ProfileDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.ProfileUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.ProfileUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$ProfilePayload>
          }
          aggregate: {
            args: Prisma.ProfileAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateProfile>
          }
          groupBy: {
            args: Prisma.ProfileGroupByArgs<ExtArgs>
            result: $Utils.Optional<ProfileGroupByOutputType>[]
          }
          count: {
            args: Prisma.ProfileCountArgs<ExtArgs>
            result: $Utils.Optional<ProfileCountAggregateOutputType> | number
          }
        }
      }
      TmdbMetadata: {
        payload: Prisma.$TmdbMetadataPayload<ExtArgs>
        fields: Prisma.TmdbMetadataFieldRefs
        operations: {
          findUnique: {
            args: Prisma.TmdbMetadataFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.TmdbMetadataFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>
          }
          findFirst: {
            args: Prisma.TmdbMetadataFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.TmdbMetadataFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>
          }
          findMany: {
            args: Prisma.TmdbMetadataFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>[]
          }
          create: {
            args: Prisma.TmdbMetadataCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>
          }
          createMany: {
            args: Prisma.TmdbMetadataCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.TmdbMetadataDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>
          }
          update: {
            args: Prisma.TmdbMetadataUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>
          }
          deleteMany: {
            args: Prisma.TmdbMetadataDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.TmdbMetadataUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.TmdbMetadataUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$TmdbMetadataPayload>
          }
          aggregate: {
            args: Prisma.TmdbMetadataAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateTmdbMetadata>
          }
          groupBy: {
            args: Prisma.TmdbMetadataGroupByArgs<ExtArgs>
            result: $Utils.Optional<TmdbMetadataGroupByOutputType>[]
          }
          count: {
            args: Prisma.TmdbMetadataCountArgs<ExtArgs>
            result: $Utils.Optional<TmdbMetadataCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    deviceUser?: DeviceUserOmit
    xtreamServer?: XtreamServerOmit
    license?: LicenseOmit
    auditLog?: AuditLogOmit
    session?: SessionOmit
    deviceToken?: DeviceTokenOmit
    deviceBlacklist?: DeviceBlacklistOmit
    playbackActivity?: PlaybackActivityOmit
    resumeProgress?: ResumeProgressOmit
    parentalConfig?: ParentalConfigOmit
    themeConfig?: ThemeConfigOmit
    profile?: ProfileOmit
    tmdbMetadata?: TmdbMetadataOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    devices: number
    licenses: number
    auditLogs: number
    sessions: number
    profiles: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    devices?: boolean | UserCountOutputTypeCountDevicesArgs
    licenses?: boolean | UserCountOutputTypeCountLicensesArgs
    auditLogs?: boolean | UserCountOutputTypeCountAuditLogsArgs
    sessions?: boolean | UserCountOutputTypeCountSessionsArgs
    profiles?: boolean | UserCountOutputTypeCountProfilesArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountDevicesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DeviceUserWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountLicensesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LicenseWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAuditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountProfilesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProfileWhereInput
  }


  /**
   * Count Type DeviceUserCountOutputType
   */

  export type DeviceUserCountOutputType = {
    licenses: number
  }

  export type DeviceUserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    licenses?: boolean | DeviceUserCountOutputTypeCountLicensesArgs
  }

  // Custom InputTypes
  /**
   * DeviceUserCountOutputType without action
   */
  export type DeviceUserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUserCountOutputType
     */
    select?: DeviceUserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * DeviceUserCountOutputType without action
   */
  export type DeviceUserCountOutputTypeCountLicensesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LicenseWhereInput
  }


  /**
   * Count Type XtreamServerCountOutputType
   */

  export type XtreamServerCountOutputType = {
    licenses: number
  }

  export type XtreamServerCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    licenses?: boolean | XtreamServerCountOutputTypeCountLicensesArgs
  }

  // Custom InputTypes
  /**
   * XtreamServerCountOutputType without action
   */
  export type XtreamServerCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServerCountOutputType
     */
    select?: XtreamServerCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * XtreamServerCountOutputType without action
   */
  export type XtreamServerCountOutputTypeCountLicensesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LicenseWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserAvgAggregateOutputType = {
    id: number | null
  }

  export type UserSumAggregateOutputType = {
    id: number | null
  }

  export type UserMinAggregateOutputType = {
    id: number | null
    name: string | null
    email: string | null
    password: string | null
    role: $Enums.UserRole | null
    isActive: boolean | null
    authProvider: $Enums.AuthProvider | null
    lastLoginAt: Date | null
    lastLoginIp: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: number | null
    name: string | null
    email: string | null
    password: string | null
    role: $Enums.UserRole | null
    isActive: boolean | null
    authProvider: $Enums.AuthProvider | null
    lastLoginAt: Date | null
    lastLoginIp: string | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    name: number
    email: number
    password: number
    role: number
    isActive: number
    authProvider: number
    lastLoginAt: number
    lastLoginIp: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type UserAvgAggregateInputType = {
    id?: true
  }

  export type UserSumAggregateInputType = {
    id?: true
  }

  export type UserMinAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    isActive?: true
    authProvider?: true
    lastLoginAt?: true
    lastLoginIp?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    isActive?: true
    authProvider?: true
    lastLoginAt?: true
    lastLoginIp?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    name?: true
    email?: true
    password?: true
    role?: true
    isActive?: true
    authProvider?: true
    lastLoginAt?: true
    lastLoginIp?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: UserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: UserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _avg?: UserAvgAggregateInputType
    _sum?: UserSumAggregateInputType
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: number
    name: string
    email: string
    password: string
    role: $Enums.UserRole
    isActive: boolean
    authProvider: $Enums.AuthProvider
    lastLoginAt: Date | null
    lastLoginIp: string | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: UserCountAggregateOutputType | null
    _avg: UserAvgAggregateOutputType | null
    _sum: UserSumAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    isActive?: boolean
    authProvider?: boolean
    lastLoginAt?: boolean
    lastLoginIp?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    devices?: boolean | User$devicesArgs<ExtArgs>
    licenses?: boolean | User$licensesArgs<ExtArgs>
    auditLogs?: boolean | User$auditLogsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    profiles?: boolean | User$profilesArgs<ExtArgs>
    parentalConfig?: boolean | User$parentalConfigArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>



  export type UserSelectScalar = {
    id?: boolean
    name?: boolean
    email?: boolean
    password?: boolean
    role?: boolean
    isActive?: boolean
    authProvider?: boolean
    lastLoginAt?: boolean
    lastLoginIp?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "email" | "password" | "role" | "isActive" | "authProvider" | "lastLoginAt" | "lastLoginIp" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    devices?: boolean | User$devicesArgs<ExtArgs>
    licenses?: boolean | User$licensesArgs<ExtArgs>
    auditLogs?: boolean | User$auditLogsArgs<ExtArgs>
    sessions?: boolean | User$sessionsArgs<ExtArgs>
    profiles?: boolean | User$profilesArgs<ExtArgs>
    parentalConfig?: boolean | User$parentalConfigArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      devices: Prisma.$DeviceUserPayload<ExtArgs>[]
      licenses: Prisma.$LicensePayload<ExtArgs>[]
      auditLogs: Prisma.$AuditLogPayload<ExtArgs>[]
      sessions: Prisma.$SessionPayload<ExtArgs>[]
      profiles: Prisma.$ProfilePayload<ExtArgs>[]
      parentalConfig: Prisma.$ParentalConfigPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      email: string
      password: string
      role: $Enums.UserRole
      isActive: boolean
      authProvider: $Enums.AuthProvider
      lastLoginAt: Date | null
      lastLoginIp: string | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    devices<T extends User$devicesArgs<ExtArgs> = {}>(args?: Subset<T, User$devicesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    licenses<T extends User$licensesArgs<ExtArgs> = {}>(args?: Subset<T, User$licensesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    auditLogs<T extends User$auditLogsArgs<ExtArgs> = {}>(args?: Subset<T, User$auditLogsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    sessions<T extends User$sessionsArgs<ExtArgs> = {}>(args?: Subset<T, User$sessionsArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    profiles<T extends User$profilesArgs<ExtArgs> = {}>(args?: Subset<T, User$profilesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    parentalConfig<T extends User$parentalConfigArgs<ExtArgs> = {}>(args?: Subset<T, User$parentalConfigArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'Int'>
    readonly name: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly password: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'UserRole'>
    readonly isActive: FieldRef<"User", 'Boolean'>
    readonly authProvider: FieldRef<"User", 'AuthProvider'>
    readonly lastLoginAt: FieldRef<"User", 'DateTime'>
    readonly lastLoginIp: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
    readonly deletedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.devices
   */
  export type User$devicesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    where?: DeviceUserWhereInput
    orderBy?: DeviceUserOrderByWithRelationInput | DeviceUserOrderByWithRelationInput[]
    cursor?: DeviceUserWhereUniqueInput
    take?: number
    skip?: number
    distinct?: DeviceUserScalarFieldEnum | DeviceUserScalarFieldEnum[]
  }

  /**
   * User.licenses
   */
  export type User$licensesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    where?: LicenseWhereInput
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    cursor?: LicenseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LicenseScalarFieldEnum | LicenseScalarFieldEnum[]
  }

  /**
   * User.auditLogs
   */
  export type User$auditLogsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    cursor?: AuditLogWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * User.sessions
   */
  export type User$sessionsArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    cursor?: SessionWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * User.profiles
   */
  export type User$profilesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    where?: ProfileWhereInput
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    cursor?: ProfileWhereUniqueInput
    take?: number
    skip?: number
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * User.parentalConfig
   */
  export type User$parentalConfigArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    where?: ParentalConfigWhereInput
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model DeviceUser
   */

  export type AggregateDeviceUser = {
    _count: DeviceUserCountAggregateOutputType | null
    _avg: DeviceUserAvgAggregateOutputType | null
    _sum: DeviceUserSumAggregateOutputType | null
    _min: DeviceUserMinAggregateOutputType | null
    _max: DeviceUserMaxAggregateOutputType | null
  }

  export type DeviceUserAvgAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type DeviceUserSumAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type DeviceUserMinAggregateOutputType = {
    id: number | null
    deviceId: string | null
    softwareId: string | null
    mac: string | null
    brand: string | null
    model: string | null
    serial: string | null
    platform: $Enums.Platform | null
    publicIp: string | null
    appVersion: string | null
    osVersion: string | null
    lastSeenAt: Date | null
    userId: number | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type DeviceUserMaxAggregateOutputType = {
    id: number | null
    deviceId: string | null
    softwareId: string | null
    mac: string | null
    brand: string | null
    model: string | null
    serial: string | null
    platform: $Enums.Platform | null
    publicIp: string | null
    appVersion: string | null
    osVersion: string | null
    lastSeenAt: Date | null
    userId: number | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type DeviceUserCountAggregateOutputType = {
    id: number
    deviceId: number
    softwareId: number
    mac: number
    brand: number
    model: number
    serial: number
    platform: number
    publicIp: number
    appVersion: number
    osVersion: number
    lastSeenAt: number
    userId: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type DeviceUserAvgAggregateInputType = {
    id?: true
    userId?: true
  }

  export type DeviceUserSumAggregateInputType = {
    id?: true
    userId?: true
  }

  export type DeviceUserMinAggregateInputType = {
    id?: true
    deviceId?: true
    softwareId?: true
    mac?: true
    brand?: true
    model?: true
    serial?: true
    platform?: true
    publicIp?: true
    appVersion?: true
    osVersion?: true
    lastSeenAt?: true
    userId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type DeviceUserMaxAggregateInputType = {
    id?: true
    deviceId?: true
    softwareId?: true
    mac?: true
    brand?: true
    model?: true
    serial?: true
    platform?: true
    publicIp?: true
    appVersion?: true
    osVersion?: true
    lastSeenAt?: true
    userId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type DeviceUserCountAggregateInputType = {
    id?: true
    deviceId?: true
    softwareId?: true
    mac?: true
    brand?: true
    model?: true
    serial?: true
    platform?: true
    publicIp?: true
    appVersion?: true
    osVersion?: true
    lastSeenAt?: true
    userId?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type DeviceUserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DeviceUser to aggregate.
     */
    where?: DeviceUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceUsers to fetch.
     */
    orderBy?: DeviceUserOrderByWithRelationInput | DeviceUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DeviceUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DeviceUsers
    **/
    _count?: true | DeviceUserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DeviceUserAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DeviceUserSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DeviceUserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DeviceUserMaxAggregateInputType
  }

  export type GetDeviceUserAggregateType<T extends DeviceUserAggregateArgs> = {
        [P in keyof T & keyof AggregateDeviceUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDeviceUser[P]>
      : GetScalarType<T[P], AggregateDeviceUser[P]>
  }




  export type DeviceUserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DeviceUserWhereInput
    orderBy?: DeviceUserOrderByWithAggregationInput | DeviceUserOrderByWithAggregationInput[]
    by: DeviceUserScalarFieldEnum[] | DeviceUserScalarFieldEnum
    having?: DeviceUserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DeviceUserCountAggregateInputType | true
    _avg?: DeviceUserAvgAggregateInputType
    _sum?: DeviceUserSumAggregateInputType
    _min?: DeviceUserMinAggregateInputType
    _max?: DeviceUserMaxAggregateInputType
  }

  export type DeviceUserGroupByOutputType = {
    id: number
    deviceId: string
    softwareId: string | null
    mac: string | null
    brand: string | null
    model: string | null
    serial: string | null
    platform: $Enums.Platform | null
    publicIp: string | null
    appVersion: string | null
    osVersion: string | null
    lastSeenAt: Date | null
    userId: number | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: DeviceUserCountAggregateOutputType | null
    _avg: DeviceUserAvgAggregateOutputType | null
    _sum: DeviceUserSumAggregateOutputType | null
    _min: DeviceUserMinAggregateOutputType | null
    _max: DeviceUserMaxAggregateOutputType | null
  }

  type GetDeviceUserGroupByPayload<T extends DeviceUserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DeviceUserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DeviceUserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DeviceUserGroupByOutputType[P]>
            : GetScalarType<T[P], DeviceUserGroupByOutputType[P]>
        }
      >
    >


  export type DeviceUserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    deviceId?: boolean
    softwareId?: boolean
    mac?: boolean
    brand?: boolean
    model?: boolean
    serial?: boolean
    platform?: boolean
    publicIp?: boolean
    appVersion?: boolean
    osVersion?: boolean
    lastSeenAt?: boolean
    userId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    user?: boolean | DeviceUser$userArgs<ExtArgs>
    licenses?: boolean | DeviceUser$licensesArgs<ExtArgs>
    _count?: boolean | DeviceUserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["deviceUser"]>



  export type DeviceUserSelectScalar = {
    id?: boolean
    deviceId?: boolean
    softwareId?: boolean
    mac?: boolean
    brand?: boolean
    model?: boolean
    serial?: boolean
    platform?: boolean
    publicIp?: boolean
    appVersion?: boolean
    osVersion?: boolean
    lastSeenAt?: boolean
    userId?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type DeviceUserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "deviceId" | "softwareId" | "mac" | "brand" | "model" | "serial" | "platform" | "publicIp" | "appVersion" | "osVersion" | "lastSeenAt" | "userId" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["deviceUser"]>
  export type DeviceUserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | DeviceUser$userArgs<ExtArgs>
    licenses?: boolean | DeviceUser$licensesArgs<ExtArgs>
    _count?: boolean | DeviceUserCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $DeviceUserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DeviceUser"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
      licenses: Prisma.$LicensePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      deviceId: string
      softwareId: string | null
      mac: string | null
      brand: string | null
      model: string | null
      serial: string | null
      platform: $Enums.Platform | null
      publicIp: string | null
      appVersion: string | null
      osVersion: string | null
      lastSeenAt: Date | null
      userId: number | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["deviceUser"]>
    composites: {}
  }

  type DeviceUserGetPayload<S extends boolean | null | undefined | DeviceUserDefaultArgs> = $Result.GetResult<Prisma.$DeviceUserPayload, S>

  type DeviceUserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DeviceUserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DeviceUserCountAggregateInputType | true
    }

  export interface DeviceUserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DeviceUser'], meta: { name: 'DeviceUser' } }
    /**
     * Find zero or one DeviceUser that matches the filter.
     * @param {DeviceUserFindUniqueArgs} args - Arguments to find a DeviceUser
     * @example
     * // Get one DeviceUser
     * const deviceUser = await prisma.deviceUser.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DeviceUserFindUniqueArgs>(args: SelectSubset<T, DeviceUserFindUniqueArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DeviceUser that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DeviceUserFindUniqueOrThrowArgs} args - Arguments to find a DeviceUser
     * @example
     * // Get one DeviceUser
     * const deviceUser = await prisma.deviceUser.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DeviceUserFindUniqueOrThrowArgs>(args: SelectSubset<T, DeviceUserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DeviceUser that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserFindFirstArgs} args - Arguments to find a DeviceUser
     * @example
     * // Get one DeviceUser
     * const deviceUser = await prisma.deviceUser.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DeviceUserFindFirstArgs>(args?: SelectSubset<T, DeviceUserFindFirstArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DeviceUser that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserFindFirstOrThrowArgs} args - Arguments to find a DeviceUser
     * @example
     * // Get one DeviceUser
     * const deviceUser = await prisma.deviceUser.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DeviceUserFindFirstOrThrowArgs>(args?: SelectSubset<T, DeviceUserFindFirstOrThrowArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DeviceUsers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DeviceUsers
     * const deviceUsers = await prisma.deviceUser.findMany()
     * 
     * // Get first 10 DeviceUsers
     * const deviceUsers = await prisma.deviceUser.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const deviceUserWithIdOnly = await prisma.deviceUser.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DeviceUserFindManyArgs>(args?: SelectSubset<T, DeviceUserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DeviceUser.
     * @param {DeviceUserCreateArgs} args - Arguments to create a DeviceUser.
     * @example
     * // Create one DeviceUser
     * const DeviceUser = await prisma.deviceUser.create({
     *   data: {
     *     // ... data to create a DeviceUser
     *   }
     * })
     * 
     */
    create<T extends DeviceUserCreateArgs>(args: SelectSubset<T, DeviceUserCreateArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DeviceUsers.
     * @param {DeviceUserCreateManyArgs} args - Arguments to create many DeviceUsers.
     * @example
     * // Create many DeviceUsers
     * const deviceUser = await prisma.deviceUser.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DeviceUserCreateManyArgs>(args?: SelectSubset<T, DeviceUserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a DeviceUser.
     * @param {DeviceUserDeleteArgs} args - Arguments to delete one DeviceUser.
     * @example
     * // Delete one DeviceUser
     * const DeviceUser = await prisma.deviceUser.delete({
     *   where: {
     *     // ... filter to delete one DeviceUser
     *   }
     * })
     * 
     */
    delete<T extends DeviceUserDeleteArgs>(args: SelectSubset<T, DeviceUserDeleteArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DeviceUser.
     * @param {DeviceUserUpdateArgs} args - Arguments to update one DeviceUser.
     * @example
     * // Update one DeviceUser
     * const deviceUser = await prisma.deviceUser.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DeviceUserUpdateArgs>(args: SelectSubset<T, DeviceUserUpdateArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DeviceUsers.
     * @param {DeviceUserDeleteManyArgs} args - Arguments to filter DeviceUsers to delete.
     * @example
     * // Delete a few DeviceUsers
     * const { count } = await prisma.deviceUser.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DeviceUserDeleteManyArgs>(args?: SelectSubset<T, DeviceUserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DeviceUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DeviceUsers
     * const deviceUser = await prisma.deviceUser.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DeviceUserUpdateManyArgs>(args: SelectSubset<T, DeviceUserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one DeviceUser.
     * @param {DeviceUserUpsertArgs} args - Arguments to update or create a DeviceUser.
     * @example
     * // Update or create a DeviceUser
     * const deviceUser = await prisma.deviceUser.upsert({
     *   create: {
     *     // ... data to create a DeviceUser
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DeviceUser we want to update
     *   }
     * })
     */
    upsert<T extends DeviceUserUpsertArgs>(args: SelectSubset<T, DeviceUserUpsertArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DeviceUsers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserCountArgs} args - Arguments to filter DeviceUsers to count.
     * @example
     * // Count the number of DeviceUsers
     * const count = await prisma.deviceUser.count({
     *   where: {
     *     // ... the filter for the DeviceUsers we want to count
     *   }
     * })
    **/
    count<T extends DeviceUserCountArgs>(
      args?: Subset<T, DeviceUserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DeviceUserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DeviceUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DeviceUserAggregateArgs>(args: Subset<T, DeviceUserAggregateArgs>): Prisma.PrismaPromise<GetDeviceUserAggregateType<T>>

    /**
     * Group by DeviceUser.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceUserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DeviceUserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DeviceUserGroupByArgs['orderBy'] }
        : { orderBy?: DeviceUserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DeviceUserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDeviceUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DeviceUser model
   */
  readonly fields: DeviceUserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DeviceUser.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DeviceUserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends DeviceUser$userArgs<ExtArgs> = {}>(args?: Subset<T, DeviceUser$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    licenses<T extends DeviceUser$licensesArgs<ExtArgs> = {}>(args?: Subset<T, DeviceUser$licensesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DeviceUser model
   */
  interface DeviceUserFieldRefs {
    readonly id: FieldRef<"DeviceUser", 'Int'>
    readonly deviceId: FieldRef<"DeviceUser", 'String'>
    readonly softwareId: FieldRef<"DeviceUser", 'String'>
    readonly mac: FieldRef<"DeviceUser", 'String'>
    readonly brand: FieldRef<"DeviceUser", 'String'>
    readonly model: FieldRef<"DeviceUser", 'String'>
    readonly serial: FieldRef<"DeviceUser", 'String'>
    readonly platform: FieldRef<"DeviceUser", 'Platform'>
    readonly publicIp: FieldRef<"DeviceUser", 'String'>
    readonly appVersion: FieldRef<"DeviceUser", 'String'>
    readonly osVersion: FieldRef<"DeviceUser", 'String'>
    readonly lastSeenAt: FieldRef<"DeviceUser", 'DateTime'>
    readonly userId: FieldRef<"DeviceUser", 'Int'>
    readonly createdAt: FieldRef<"DeviceUser", 'DateTime'>
    readonly updatedAt: FieldRef<"DeviceUser", 'DateTime'>
    readonly deletedAt: FieldRef<"DeviceUser", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DeviceUser findUnique
   */
  export type DeviceUserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * Filter, which DeviceUser to fetch.
     */
    where: DeviceUserWhereUniqueInput
  }

  /**
   * DeviceUser findUniqueOrThrow
   */
  export type DeviceUserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * Filter, which DeviceUser to fetch.
     */
    where: DeviceUserWhereUniqueInput
  }

  /**
   * DeviceUser findFirst
   */
  export type DeviceUserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * Filter, which DeviceUser to fetch.
     */
    where?: DeviceUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceUsers to fetch.
     */
    orderBy?: DeviceUserOrderByWithRelationInput | DeviceUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DeviceUsers.
     */
    cursor?: DeviceUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DeviceUsers.
     */
    distinct?: DeviceUserScalarFieldEnum | DeviceUserScalarFieldEnum[]
  }

  /**
   * DeviceUser findFirstOrThrow
   */
  export type DeviceUserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * Filter, which DeviceUser to fetch.
     */
    where?: DeviceUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceUsers to fetch.
     */
    orderBy?: DeviceUserOrderByWithRelationInput | DeviceUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DeviceUsers.
     */
    cursor?: DeviceUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceUsers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DeviceUsers.
     */
    distinct?: DeviceUserScalarFieldEnum | DeviceUserScalarFieldEnum[]
  }

  /**
   * DeviceUser findMany
   */
  export type DeviceUserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * Filter, which DeviceUsers to fetch.
     */
    where?: DeviceUserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceUsers to fetch.
     */
    orderBy?: DeviceUserOrderByWithRelationInput | DeviceUserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DeviceUsers.
     */
    cursor?: DeviceUserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceUsers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceUsers.
     */
    skip?: number
    distinct?: DeviceUserScalarFieldEnum | DeviceUserScalarFieldEnum[]
  }

  /**
   * DeviceUser create
   */
  export type DeviceUserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * The data needed to create a DeviceUser.
     */
    data: XOR<DeviceUserCreateInput, DeviceUserUncheckedCreateInput>
  }

  /**
   * DeviceUser createMany
   */
  export type DeviceUserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DeviceUsers.
     */
    data: DeviceUserCreateManyInput | DeviceUserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DeviceUser update
   */
  export type DeviceUserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * The data needed to update a DeviceUser.
     */
    data: XOR<DeviceUserUpdateInput, DeviceUserUncheckedUpdateInput>
    /**
     * Choose, which DeviceUser to update.
     */
    where: DeviceUserWhereUniqueInput
  }

  /**
   * DeviceUser updateMany
   */
  export type DeviceUserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DeviceUsers.
     */
    data: XOR<DeviceUserUpdateManyMutationInput, DeviceUserUncheckedUpdateManyInput>
    /**
     * Filter which DeviceUsers to update
     */
    where?: DeviceUserWhereInput
    /**
     * Limit how many DeviceUsers to update.
     */
    limit?: number
  }

  /**
   * DeviceUser upsert
   */
  export type DeviceUserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * The filter to search for the DeviceUser to update in case it exists.
     */
    where: DeviceUserWhereUniqueInput
    /**
     * In case the DeviceUser found by the `where` argument doesn't exist, create a new DeviceUser with this data.
     */
    create: XOR<DeviceUserCreateInput, DeviceUserUncheckedCreateInput>
    /**
     * In case the DeviceUser was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DeviceUserUpdateInput, DeviceUserUncheckedUpdateInput>
  }

  /**
   * DeviceUser delete
   */
  export type DeviceUserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    /**
     * Filter which DeviceUser to delete.
     */
    where: DeviceUserWhereUniqueInput
  }

  /**
   * DeviceUser deleteMany
   */
  export type DeviceUserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DeviceUsers to delete
     */
    where?: DeviceUserWhereInput
    /**
     * Limit how many DeviceUsers to delete.
     */
    limit?: number
  }

  /**
   * DeviceUser.user
   */
  export type DeviceUser$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * DeviceUser.licenses
   */
  export type DeviceUser$licensesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    where?: LicenseWhereInput
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    cursor?: LicenseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LicenseScalarFieldEnum | LicenseScalarFieldEnum[]
  }

  /**
   * DeviceUser without action
   */
  export type DeviceUserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
  }


  /**
   * Model XtreamServer
   */

  export type AggregateXtreamServer = {
    _count: XtreamServerCountAggregateOutputType | null
    _avg: XtreamServerAvgAggregateOutputType | null
    _sum: XtreamServerSumAggregateOutputType | null
    _min: XtreamServerMinAggregateOutputType | null
    _max: XtreamServerMaxAggregateOutputType | null
  }

  export type XtreamServerAvgAggregateOutputType = {
    id: number | null
  }

  export type XtreamServerSumAggregateOutputType = {
    id: number | null
  }

  export type XtreamServerMinAggregateOutputType = {
    id: number | null
    name: string | null
    url: string | null
    serverIdentity: string | null
    isActive: boolean | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type XtreamServerMaxAggregateOutputType = {
    id: number | null
    name: string | null
    url: string | null
    serverIdentity: string | null
    isActive: boolean | null
    isDefault: boolean | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type XtreamServerCountAggregateOutputType = {
    id: number
    name: number
    url: number
    serverIdentity: number
    isActive: number
    isDefault: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type XtreamServerAvgAggregateInputType = {
    id?: true
  }

  export type XtreamServerSumAggregateInputType = {
    id?: true
  }

  export type XtreamServerMinAggregateInputType = {
    id?: true
    name?: true
    url?: true
    serverIdentity?: true
    isActive?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type XtreamServerMaxAggregateInputType = {
    id?: true
    name?: true
    url?: true
    serverIdentity?: true
    isActive?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
  }

  export type XtreamServerCountAggregateInputType = {
    id?: true
    name?: true
    url?: true
    serverIdentity?: true
    isActive?: true
    isDefault?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type XtreamServerAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which XtreamServer to aggregate.
     */
    where?: XtreamServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of XtreamServers to fetch.
     */
    orderBy?: XtreamServerOrderByWithRelationInput | XtreamServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: XtreamServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` XtreamServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` XtreamServers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned XtreamServers
    **/
    _count?: true | XtreamServerCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: XtreamServerAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: XtreamServerSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: XtreamServerMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: XtreamServerMaxAggregateInputType
  }

  export type GetXtreamServerAggregateType<T extends XtreamServerAggregateArgs> = {
        [P in keyof T & keyof AggregateXtreamServer]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateXtreamServer[P]>
      : GetScalarType<T[P], AggregateXtreamServer[P]>
  }




  export type XtreamServerGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: XtreamServerWhereInput
    orderBy?: XtreamServerOrderByWithAggregationInput | XtreamServerOrderByWithAggregationInput[]
    by: XtreamServerScalarFieldEnum[] | XtreamServerScalarFieldEnum
    having?: XtreamServerScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: XtreamServerCountAggregateInputType | true
    _avg?: XtreamServerAvgAggregateInputType
    _sum?: XtreamServerSumAggregateInputType
    _min?: XtreamServerMinAggregateInputType
    _max?: XtreamServerMaxAggregateInputType
  }

  export type XtreamServerGroupByOutputType = {
    id: number
    name: string
    url: string
    serverIdentity: string
    isActive: boolean
    isDefault: boolean
    createdAt: Date
    updatedAt: Date
    _count: XtreamServerCountAggregateOutputType | null
    _avg: XtreamServerAvgAggregateOutputType | null
    _sum: XtreamServerSumAggregateOutputType | null
    _min: XtreamServerMinAggregateOutputType | null
    _max: XtreamServerMaxAggregateOutputType | null
  }

  type GetXtreamServerGroupByPayload<T extends XtreamServerGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<XtreamServerGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof XtreamServerGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], XtreamServerGroupByOutputType[P]>
            : GetScalarType<T[P], XtreamServerGroupByOutputType[P]>
        }
      >
    >


  export type XtreamServerSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    name?: boolean
    url?: boolean
    serverIdentity?: boolean
    isActive?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    licenses?: boolean | XtreamServer$licensesArgs<ExtArgs>
    _count?: boolean | XtreamServerCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["xtreamServer"]>



  export type XtreamServerSelectScalar = {
    id?: boolean
    name?: boolean
    url?: boolean
    serverIdentity?: boolean
    isActive?: boolean
    isDefault?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type XtreamServerOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "name" | "url" | "serverIdentity" | "isActive" | "isDefault" | "createdAt" | "updatedAt", ExtArgs["result"]["xtreamServer"]>
  export type XtreamServerInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    licenses?: boolean | XtreamServer$licensesArgs<ExtArgs>
    _count?: boolean | XtreamServerCountOutputTypeDefaultArgs<ExtArgs>
  }

  export type $XtreamServerPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "XtreamServer"
    objects: {
      licenses: Prisma.$LicensePayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      name: string
      url: string
      serverIdentity: string
      isActive: boolean
      isDefault: boolean
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["xtreamServer"]>
    composites: {}
  }

  type XtreamServerGetPayload<S extends boolean | null | undefined | XtreamServerDefaultArgs> = $Result.GetResult<Prisma.$XtreamServerPayload, S>

  type XtreamServerCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<XtreamServerFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: XtreamServerCountAggregateInputType | true
    }

  export interface XtreamServerDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['XtreamServer'], meta: { name: 'XtreamServer' } }
    /**
     * Find zero or one XtreamServer that matches the filter.
     * @param {XtreamServerFindUniqueArgs} args - Arguments to find a XtreamServer
     * @example
     * // Get one XtreamServer
     * const xtreamServer = await prisma.xtreamServer.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends XtreamServerFindUniqueArgs>(args: SelectSubset<T, XtreamServerFindUniqueArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one XtreamServer that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {XtreamServerFindUniqueOrThrowArgs} args - Arguments to find a XtreamServer
     * @example
     * // Get one XtreamServer
     * const xtreamServer = await prisma.xtreamServer.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends XtreamServerFindUniqueOrThrowArgs>(args: SelectSubset<T, XtreamServerFindUniqueOrThrowArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first XtreamServer that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerFindFirstArgs} args - Arguments to find a XtreamServer
     * @example
     * // Get one XtreamServer
     * const xtreamServer = await prisma.xtreamServer.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends XtreamServerFindFirstArgs>(args?: SelectSubset<T, XtreamServerFindFirstArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first XtreamServer that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerFindFirstOrThrowArgs} args - Arguments to find a XtreamServer
     * @example
     * // Get one XtreamServer
     * const xtreamServer = await prisma.xtreamServer.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends XtreamServerFindFirstOrThrowArgs>(args?: SelectSubset<T, XtreamServerFindFirstOrThrowArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more XtreamServers that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all XtreamServers
     * const xtreamServers = await prisma.xtreamServer.findMany()
     * 
     * // Get first 10 XtreamServers
     * const xtreamServers = await prisma.xtreamServer.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const xtreamServerWithIdOnly = await prisma.xtreamServer.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends XtreamServerFindManyArgs>(args?: SelectSubset<T, XtreamServerFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a XtreamServer.
     * @param {XtreamServerCreateArgs} args - Arguments to create a XtreamServer.
     * @example
     * // Create one XtreamServer
     * const XtreamServer = await prisma.xtreamServer.create({
     *   data: {
     *     // ... data to create a XtreamServer
     *   }
     * })
     * 
     */
    create<T extends XtreamServerCreateArgs>(args: SelectSubset<T, XtreamServerCreateArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many XtreamServers.
     * @param {XtreamServerCreateManyArgs} args - Arguments to create many XtreamServers.
     * @example
     * // Create many XtreamServers
     * const xtreamServer = await prisma.xtreamServer.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends XtreamServerCreateManyArgs>(args?: SelectSubset<T, XtreamServerCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a XtreamServer.
     * @param {XtreamServerDeleteArgs} args - Arguments to delete one XtreamServer.
     * @example
     * // Delete one XtreamServer
     * const XtreamServer = await prisma.xtreamServer.delete({
     *   where: {
     *     // ... filter to delete one XtreamServer
     *   }
     * })
     * 
     */
    delete<T extends XtreamServerDeleteArgs>(args: SelectSubset<T, XtreamServerDeleteArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one XtreamServer.
     * @param {XtreamServerUpdateArgs} args - Arguments to update one XtreamServer.
     * @example
     * // Update one XtreamServer
     * const xtreamServer = await prisma.xtreamServer.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends XtreamServerUpdateArgs>(args: SelectSubset<T, XtreamServerUpdateArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more XtreamServers.
     * @param {XtreamServerDeleteManyArgs} args - Arguments to filter XtreamServers to delete.
     * @example
     * // Delete a few XtreamServers
     * const { count } = await prisma.xtreamServer.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends XtreamServerDeleteManyArgs>(args?: SelectSubset<T, XtreamServerDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more XtreamServers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many XtreamServers
     * const xtreamServer = await prisma.xtreamServer.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends XtreamServerUpdateManyArgs>(args: SelectSubset<T, XtreamServerUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one XtreamServer.
     * @param {XtreamServerUpsertArgs} args - Arguments to update or create a XtreamServer.
     * @example
     * // Update or create a XtreamServer
     * const xtreamServer = await prisma.xtreamServer.upsert({
     *   create: {
     *     // ... data to create a XtreamServer
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the XtreamServer we want to update
     *   }
     * })
     */
    upsert<T extends XtreamServerUpsertArgs>(args: SelectSubset<T, XtreamServerUpsertArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of XtreamServers.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerCountArgs} args - Arguments to filter XtreamServers to count.
     * @example
     * // Count the number of XtreamServers
     * const count = await prisma.xtreamServer.count({
     *   where: {
     *     // ... the filter for the XtreamServers we want to count
     *   }
     * })
    **/
    count<T extends XtreamServerCountArgs>(
      args?: Subset<T, XtreamServerCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], XtreamServerCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a XtreamServer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends XtreamServerAggregateArgs>(args: Subset<T, XtreamServerAggregateArgs>): Prisma.PrismaPromise<GetXtreamServerAggregateType<T>>

    /**
     * Group by XtreamServer.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {XtreamServerGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends XtreamServerGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: XtreamServerGroupByArgs['orderBy'] }
        : { orderBy?: XtreamServerGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, XtreamServerGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetXtreamServerGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the XtreamServer model
   */
  readonly fields: XtreamServerFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for XtreamServer.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__XtreamServerClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    licenses<T extends XtreamServer$licensesArgs<ExtArgs> = {}>(args?: Subset<T, XtreamServer$licensesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the XtreamServer model
   */
  interface XtreamServerFieldRefs {
    readonly id: FieldRef<"XtreamServer", 'Int'>
    readonly name: FieldRef<"XtreamServer", 'String'>
    readonly url: FieldRef<"XtreamServer", 'String'>
    readonly serverIdentity: FieldRef<"XtreamServer", 'String'>
    readonly isActive: FieldRef<"XtreamServer", 'Boolean'>
    readonly isDefault: FieldRef<"XtreamServer", 'Boolean'>
    readonly createdAt: FieldRef<"XtreamServer", 'DateTime'>
    readonly updatedAt: FieldRef<"XtreamServer", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * XtreamServer findUnique
   */
  export type XtreamServerFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * Filter, which XtreamServer to fetch.
     */
    where: XtreamServerWhereUniqueInput
  }

  /**
   * XtreamServer findUniqueOrThrow
   */
  export type XtreamServerFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * Filter, which XtreamServer to fetch.
     */
    where: XtreamServerWhereUniqueInput
  }

  /**
   * XtreamServer findFirst
   */
  export type XtreamServerFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * Filter, which XtreamServer to fetch.
     */
    where?: XtreamServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of XtreamServers to fetch.
     */
    orderBy?: XtreamServerOrderByWithRelationInput | XtreamServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for XtreamServers.
     */
    cursor?: XtreamServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` XtreamServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` XtreamServers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of XtreamServers.
     */
    distinct?: XtreamServerScalarFieldEnum | XtreamServerScalarFieldEnum[]
  }

  /**
   * XtreamServer findFirstOrThrow
   */
  export type XtreamServerFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * Filter, which XtreamServer to fetch.
     */
    where?: XtreamServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of XtreamServers to fetch.
     */
    orderBy?: XtreamServerOrderByWithRelationInput | XtreamServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for XtreamServers.
     */
    cursor?: XtreamServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` XtreamServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` XtreamServers.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of XtreamServers.
     */
    distinct?: XtreamServerScalarFieldEnum | XtreamServerScalarFieldEnum[]
  }

  /**
   * XtreamServer findMany
   */
  export type XtreamServerFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * Filter, which XtreamServers to fetch.
     */
    where?: XtreamServerWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of XtreamServers to fetch.
     */
    orderBy?: XtreamServerOrderByWithRelationInput | XtreamServerOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing XtreamServers.
     */
    cursor?: XtreamServerWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` XtreamServers from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` XtreamServers.
     */
    skip?: number
    distinct?: XtreamServerScalarFieldEnum | XtreamServerScalarFieldEnum[]
  }

  /**
   * XtreamServer create
   */
  export type XtreamServerCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * The data needed to create a XtreamServer.
     */
    data: XOR<XtreamServerCreateInput, XtreamServerUncheckedCreateInput>
  }

  /**
   * XtreamServer createMany
   */
  export type XtreamServerCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many XtreamServers.
     */
    data: XtreamServerCreateManyInput | XtreamServerCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * XtreamServer update
   */
  export type XtreamServerUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * The data needed to update a XtreamServer.
     */
    data: XOR<XtreamServerUpdateInput, XtreamServerUncheckedUpdateInput>
    /**
     * Choose, which XtreamServer to update.
     */
    where: XtreamServerWhereUniqueInput
  }

  /**
   * XtreamServer updateMany
   */
  export type XtreamServerUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update XtreamServers.
     */
    data: XOR<XtreamServerUpdateManyMutationInput, XtreamServerUncheckedUpdateManyInput>
    /**
     * Filter which XtreamServers to update
     */
    where?: XtreamServerWhereInput
    /**
     * Limit how many XtreamServers to update.
     */
    limit?: number
  }

  /**
   * XtreamServer upsert
   */
  export type XtreamServerUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * The filter to search for the XtreamServer to update in case it exists.
     */
    where: XtreamServerWhereUniqueInput
    /**
     * In case the XtreamServer found by the `where` argument doesn't exist, create a new XtreamServer with this data.
     */
    create: XOR<XtreamServerCreateInput, XtreamServerUncheckedCreateInput>
    /**
     * In case the XtreamServer was found with the provided `where` argument, update it with this data.
     */
    update: XOR<XtreamServerUpdateInput, XtreamServerUncheckedUpdateInput>
  }

  /**
   * XtreamServer delete
   */
  export type XtreamServerDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    /**
     * Filter which XtreamServer to delete.
     */
    where: XtreamServerWhereUniqueInput
  }

  /**
   * XtreamServer deleteMany
   */
  export type XtreamServerDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which XtreamServers to delete
     */
    where?: XtreamServerWhereInput
    /**
     * Limit how many XtreamServers to delete.
     */
    limit?: number
  }

  /**
   * XtreamServer.licenses
   */
  export type XtreamServer$licensesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    where?: LicenseWhereInput
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    cursor?: LicenseWhereUniqueInput
    take?: number
    skip?: number
    distinct?: LicenseScalarFieldEnum | LicenseScalarFieldEnum[]
  }

  /**
   * XtreamServer without action
   */
  export type XtreamServerDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
  }


  /**
   * Model License
   */

  export type AggregateLicense = {
    _count: LicenseCountAggregateOutputType | null
    _avg: LicenseAvgAggregateOutputType | null
    _sum: LicenseSumAggregateOutputType | null
    _min: LicenseMinAggregateOutputType | null
    _max: LicenseMaxAggregateOutputType | null
  }

  export type LicenseAvgAggregateOutputType = {
    id: number | null
    userId: number | null
    deviceUserId: number | null
    serverId: number | null
  }

  export type LicenseSumAggregateOutputType = {
    id: number | null
    userId: number | null
    deviceUserId: number | null
    serverId: number | null
  }

  export type LicenseMinAggregateOutputType = {
    id: number | null
    key: string | null
    userId: number | null
    deviceUserId: number | null
    serverId: number | null
    xtreamUser: string | null
    xtreamPass: string | null
    plan: $Enums.LicensePlan | null
    status: $Enums.LicenseStatus | null
    expiresAt: Date | null
    activatedAt: Date | null
    lastUsedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type LicenseMaxAggregateOutputType = {
    id: number | null
    key: string | null
    userId: number | null
    deviceUserId: number | null
    serverId: number | null
    xtreamUser: string | null
    xtreamPass: string | null
    plan: $Enums.LicensePlan | null
    status: $Enums.LicenseStatus | null
    expiresAt: Date | null
    activatedAt: Date | null
    lastUsedAt: Date | null
    createdAt: Date | null
    updatedAt: Date | null
    deletedAt: Date | null
  }

  export type LicenseCountAggregateOutputType = {
    id: number
    key: number
    userId: number
    deviceUserId: number
    serverId: number
    xtreamUser: number
    xtreamPass: number
    plan: number
    status: number
    expiresAt: number
    activatedAt: number
    lastUsedAt: number
    createdAt: number
    updatedAt: number
    deletedAt: number
    _all: number
  }


  export type LicenseAvgAggregateInputType = {
    id?: true
    userId?: true
    deviceUserId?: true
    serverId?: true
  }

  export type LicenseSumAggregateInputType = {
    id?: true
    userId?: true
    deviceUserId?: true
    serverId?: true
  }

  export type LicenseMinAggregateInputType = {
    id?: true
    key?: true
    userId?: true
    deviceUserId?: true
    serverId?: true
    xtreamUser?: true
    xtreamPass?: true
    plan?: true
    status?: true
    expiresAt?: true
    activatedAt?: true
    lastUsedAt?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type LicenseMaxAggregateInputType = {
    id?: true
    key?: true
    userId?: true
    deviceUserId?: true
    serverId?: true
    xtreamUser?: true
    xtreamPass?: true
    plan?: true
    status?: true
    expiresAt?: true
    activatedAt?: true
    lastUsedAt?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
  }

  export type LicenseCountAggregateInputType = {
    id?: true
    key?: true
    userId?: true
    deviceUserId?: true
    serverId?: true
    xtreamUser?: true
    xtreamPass?: true
    plan?: true
    status?: true
    expiresAt?: true
    activatedAt?: true
    lastUsedAt?: true
    createdAt?: true
    updatedAt?: true
    deletedAt?: true
    _all?: true
  }

  export type LicenseAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which License to aggregate.
     */
    where?: LicenseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Licenses to fetch.
     */
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: LicenseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Licenses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Licenses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Licenses
    **/
    _count?: true | LicenseCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: LicenseAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: LicenseSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: LicenseMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: LicenseMaxAggregateInputType
  }

  export type GetLicenseAggregateType<T extends LicenseAggregateArgs> = {
        [P in keyof T & keyof AggregateLicense]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateLicense[P]>
      : GetScalarType<T[P], AggregateLicense[P]>
  }




  export type LicenseGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: LicenseWhereInput
    orderBy?: LicenseOrderByWithAggregationInput | LicenseOrderByWithAggregationInput[]
    by: LicenseScalarFieldEnum[] | LicenseScalarFieldEnum
    having?: LicenseScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: LicenseCountAggregateInputType | true
    _avg?: LicenseAvgAggregateInputType
    _sum?: LicenseSumAggregateInputType
    _min?: LicenseMinAggregateInputType
    _max?: LicenseMaxAggregateInputType
  }

  export type LicenseGroupByOutputType = {
    id: number
    key: string
    userId: number | null
    deviceUserId: number | null
    serverId: number | null
    xtreamUser: string | null
    xtreamPass: string | null
    plan: $Enums.LicensePlan
    status: $Enums.LicenseStatus
    expiresAt: Date | null
    activatedAt: Date | null
    lastUsedAt: Date | null
    createdAt: Date
    updatedAt: Date
    deletedAt: Date | null
    _count: LicenseCountAggregateOutputType | null
    _avg: LicenseAvgAggregateOutputType | null
    _sum: LicenseSumAggregateOutputType | null
    _min: LicenseMinAggregateOutputType | null
    _max: LicenseMaxAggregateOutputType | null
  }

  type GetLicenseGroupByPayload<T extends LicenseGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<LicenseGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof LicenseGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], LicenseGroupByOutputType[P]>
            : GetScalarType<T[P], LicenseGroupByOutputType[P]>
        }
      >
    >


  export type LicenseSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    key?: boolean
    userId?: boolean
    deviceUserId?: boolean
    serverId?: boolean
    xtreamUser?: boolean
    xtreamPass?: boolean
    plan?: boolean
    status?: boolean
    expiresAt?: boolean
    activatedAt?: boolean
    lastUsedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
    user?: boolean | License$userArgs<ExtArgs>
    deviceUser?: boolean | License$deviceUserArgs<ExtArgs>
    server?: boolean | License$serverArgs<ExtArgs>
  }, ExtArgs["result"]["license"]>



  export type LicenseSelectScalar = {
    id?: boolean
    key?: boolean
    userId?: boolean
    deviceUserId?: boolean
    serverId?: boolean
    xtreamUser?: boolean
    xtreamPass?: boolean
    plan?: boolean
    status?: boolean
    expiresAt?: boolean
    activatedAt?: boolean
    lastUsedAt?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    deletedAt?: boolean
  }

  export type LicenseOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "key" | "userId" | "deviceUserId" | "serverId" | "xtreamUser" | "xtreamPass" | "plan" | "status" | "expiresAt" | "activatedAt" | "lastUsedAt" | "createdAt" | "updatedAt" | "deletedAt", ExtArgs["result"]["license"]>
  export type LicenseInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | License$userArgs<ExtArgs>
    deviceUser?: boolean | License$deviceUserArgs<ExtArgs>
    server?: boolean | License$serverArgs<ExtArgs>
  }

  export type $LicensePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "License"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
      deviceUser: Prisma.$DeviceUserPayload<ExtArgs> | null
      server: Prisma.$XtreamServerPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      key: string
      userId: number | null
      deviceUserId: number | null
      serverId: number | null
      xtreamUser: string | null
      xtreamPass: string | null
      plan: $Enums.LicensePlan
      status: $Enums.LicenseStatus
      expiresAt: Date | null
      activatedAt: Date | null
      lastUsedAt: Date | null
      createdAt: Date
      updatedAt: Date
      deletedAt: Date | null
    }, ExtArgs["result"]["license"]>
    composites: {}
  }

  type LicenseGetPayload<S extends boolean | null | undefined | LicenseDefaultArgs> = $Result.GetResult<Prisma.$LicensePayload, S>

  type LicenseCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<LicenseFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: LicenseCountAggregateInputType | true
    }

  export interface LicenseDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['License'], meta: { name: 'License' } }
    /**
     * Find zero or one License that matches the filter.
     * @param {LicenseFindUniqueArgs} args - Arguments to find a License
     * @example
     * // Get one License
     * const license = await prisma.license.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends LicenseFindUniqueArgs>(args: SelectSubset<T, LicenseFindUniqueArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one License that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {LicenseFindUniqueOrThrowArgs} args - Arguments to find a License
     * @example
     * // Get one License
     * const license = await prisma.license.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends LicenseFindUniqueOrThrowArgs>(args: SelectSubset<T, LicenseFindUniqueOrThrowArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first License that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseFindFirstArgs} args - Arguments to find a License
     * @example
     * // Get one License
     * const license = await prisma.license.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends LicenseFindFirstArgs>(args?: SelectSubset<T, LicenseFindFirstArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first License that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseFindFirstOrThrowArgs} args - Arguments to find a License
     * @example
     * // Get one License
     * const license = await prisma.license.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends LicenseFindFirstOrThrowArgs>(args?: SelectSubset<T, LicenseFindFirstOrThrowArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Licenses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Licenses
     * const licenses = await prisma.license.findMany()
     * 
     * // Get first 10 Licenses
     * const licenses = await prisma.license.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const licenseWithIdOnly = await prisma.license.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends LicenseFindManyArgs>(args?: SelectSubset<T, LicenseFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a License.
     * @param {LicenseCreateArgs} args - Arguments to create a License.
     * @example
     * // Create one License
     * const License = await prisma.license.create({
     *   data: {
     *     // ... data to create a License
     *   }
     * })
     * 
     */
    create<T extends LicenseCreateArgs>(args: SelectSubset<T, LicenseCreateArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Licenses.
     * @param {LicenseCreateManyArgs} args - Arguments to create many Licenses.
     * @example
     * // Create many Licenses
     * const license = await prisma.license.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends LicenseCreateManyArgs>(args?: SelectSubset<T, LicenseCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a License.
     * @param {LicenseDeleteArgs} args - Arguments to delete one License.
     * @example
     * // Delete one License
     * const License = await prisma.license.delete({
     *   where: {
     *     // ... filter to delete one License
     *   }
     * })
     * 
     */
    delete<T extends LicenseDeleteArgs>(args: SelectSubset<T, LicenseDeleteArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one License.
     * @param {LicenseUpdateArgs} args - Arguments to update one License.
     * @example
     * // Update one License
     * const license = await prisma.license.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends LicenseUpdateArgs>(args: SelectSubset<T, LicenseUpdateArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Licenses.
     * @param {LicenseDeleteManyArgs} args - Arguments to filter Licenses to delete.
     * @example
     * // Delete a few Licenses
     * const { count } = await prisma.license.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends LicenseDeleteManyArgs>(args?: SelectSubset<T, LicenseDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Licenses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Licenses
     * const license = await prisma.license.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends LicenseUpdateManyArgs>(args: SelectSubset<T, LicenseUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one License.
     * @param {LicenseUpsertArgs} args - Arguments to update or create a License.
     * @example
     * // Update or create a License
     * const license = await prisma.license.upsert({
     *   create: {
     *     // ... data to create a License
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the License we want to update
     *   }
     * })
     */
    upsert<T extends LicenseUpsertArgs>(args: SelectSubset<T, LicenseUpsertArgs<ExtArgs>>): Prisma__LicenseClient<$Result.GetResult<Prisma.$LicensePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Licenses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseCountArgs} args - Arguments to filter Licenses to count.
     * @example
     * // Count the number of Licenses
     * const count = await prisma.license.count({
     *   where: {
     *     // ... the filter for the Licenses we want to count
     *   }
     * })
    **/
    count<T extends LicenseCountArgs>(
      args?: Subset<T, LicenseCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], LicenseCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a License.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends LicenseAggregateArgs>(args: Subset<T, LicenseAggregateArgs>): Prisma.PrismaPromise<GetLicenseAggregateType<T>>

    /**
     * Group by License.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {LicenseGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends LicenseGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: LicenseGroupByArgs['orderBy'] }
        : { orderBy?: LicenseGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, LicenseGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetLicenseGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the License model
   */
  readonly fields: LicenseFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for License.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__LicenseClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends License$userArgs<ExtArgs> = {}>(args?: Subset<T, License$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    deviceUser<T extends License$deviceUserArgs<ExtArgs> = {}>(args?: Subset<T, License$deviceUserArgs<ExtArgs>>): Prisma__DeviceUserClient<$Result.GetResult<Prisma.$DeviceUserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    server<T extends License$serverArgs<ExtArgs> = {}>(args?: Subset<T, License$serverArgs<ExtArgs>>): Prisma__XtreamServerClient<$Result.GetResult<Prisma.$XtreamServerPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the License model
   */
  interface LicenseFieldRefs {
    readonly id: FieldRef<"License", 'Int'>
    readonly key: FieldRef<"License", 'String'>
    readonly userId: FieldRef<"License", 'Int'>
    readonly deviceUserId: FieldRef<"License", 'Int'>
    readonly serverId: FieldRef<"License", 'Int'>
    readonly xtreamUser: FieldRef<"License", 'String'>
    readonly xtreamPass: FieldRef<"License", 'String'>
    readonly plan: FieldRef<"License", 'LicensePlan'>
    readonly status: FieldRef<"License", 'LicenseStatus'>
    readonly expiresAt: FieldRef<"License", 'DateTime'>
    readonly activatedAt: FieldRef<"License", 'DateTime'>
    readonly lastUsedAt: FieldRef<"License", 'DateTime'>
    readonly createdAt: FieldRef<"License", 'DateTime'>
    readonly updatedAt: FieldRef<"License", 'DateTime'>
    readonly deletedAt: FieldRef<"License", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * License findUnique
   */
  export type LicenseFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * Filter, which License to fetch.
     */
    where: LicenseWhereUniqueInput
  }

  /**
   * License findUniqueOrThrow
   */
  export type LicenseFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * Filter, which License to fetch.
     */
    where: LicenseWhereUniqueInput
  }

  /**
   * License findFirst
   */
  export type LicenseFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * Filter, which License to fetch.
     */
    where?: LicenseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Licenses to fetch.
     */
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Licenses.
     */
    cursor?: LicenseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Licenses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Licenses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Licenses.
     */
    distinct?: LicenseScalarFieldEnum | LicenseScalarFieldEnum[]
  }

  /**
   * License findFirstOrThrow
   */
  export type LicenseFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * Filter, which License to fetch.
     */
    where?: LicenseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Licenses to fetch.
     */
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Licenses.
     */
    cursor?: LicenseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Licenses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Licenses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Licenses.
     */
    distinct?: LicenseScalarFieldEnum | LicenseScalarFieldEnum[]
  }

  /**
   * License findMany
   */
  export type LicenseFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * Filter, which Licenses to fetch.
     */
    where?: LicenseWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Licenses to fetch.
     */
    orderBy?: LicenseOrderByWithRelationInput | LicenseOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Licenses.
     */
    cursor?: LicenseWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Licenses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Licenses.
     */
    skip?: number
    distinct?: LicenseScalarFieldEnum | LicenseScalarFieldEnum[]
  }

  /**
   * License create
   */
  export type LicenseCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * The data needed to create a License.
     */
    data: XOR<LicenseCreateInput, LicenseUncheckedCreateInput>
  }

  /**
   * License createMany
   */
  export type LicenseCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Licenses.
     */
    data: LicenseCreateManyInput | LicenseCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * License update
   */
  export type LicenseUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * The data needed to update a License.
     */
    data: XOR<LicenseUpdateInput, LicenseUncheckedUpdateInput>
    /**
     * Choose, which License to update.
     */
    where: LicenseWhereUniqueInput
  }

  /**
   * License updateMany
   */
  export type LicenseUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Licenses.
     */
    data: XOR<LicenseUpdateManyMutationInput, LicenseUncheckedUpdateManyInput>
    /**
     * Filter which Licenses to update
     */
    where?: LicenseWhereInput
    /**
     * Limit how many Licenses to update.
     */
    limit?: number
  }

  /**
   * License upsert
   */
  export type LicenseUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * The filter to search for the License to update in case it exists.
     */
    where: LicenseWhereUniqueInput
    /**
     * In case the License found by the `where` argument doesn't exist, create a new License with this data.
     */
    create: XOR<LicenseCreateInput, LicenseUncheckedCreateInput>
    /**
     * In case the License was found with the provided `where` argument, update it with this data.
     */
    update: XOR<LicenseUpdateInput, LicenseUncheckedUpdateInput>
  }

  /**
   * License delete
   */
  export type LicenseDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
    /**
     * Filter which License to delete.
     */
    where: LicenseWhereUniqueInput
  }

  /**
   * License deleteMany
   */
  export type LicenseDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Licenses to delete
     */
    where?: LicenseWhereInput
    /**
     * Limit how many Licenses to delete.
     */
    limit?: number
  }

  /**
   * License.user
   */
  export type License$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * License.deviceUser
   */
  export type License$deviceUserArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceUser
     */
    select?: DeviceUserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceUser
     */
    omit?: DeviceUserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: DeviceUserInclude<ExtArgs> | null
    where?: DeviceUserWhereInput
  }

  /**
   * License.server
   */
  export type License$serverArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the XtreamServer
     */
    select?: XtreamServerSelect<ExtArgs> | null
    /**
     * Omit specific fields from the XtreamServer
     */
    omit?: XtreamServerOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: XtreamServerInclude<ExtArgs> | null
    where?: XtreamServerWhereInput
  }

  /**
   * License without action
   */
  export type LicenseDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the License
     */
    select?: LicenseSelect<ExtArgs> | null
    /**
     * Omit specific fields from the License
     */
    omit?: LicenseOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: LicenseInclude<ExtArgs> | null
  }


  /**
   * Model AuditLog
   */

  export type AggregateAuditLog = {
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  export type AuditLogAvgAggregateOutputType = {
    id: number | null
    userId: number | null
    entityId: number | null
  }

  export type AuditLogSumAggregateOutputType = {
    id: number | null
    userId: number | null
    entityId: number | null
  }

  export type AuditLogMinAggregateOutputType = {
    id: number | null
    userId: number | null
    action: $Enums.AuditAction | null
    entity: string | null
    entityId: number | null
    details: string | null
    ipAddress: string | null
    createdAt: Date | null
  }

  export type AuditLogMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    action: $Enums.AuditAction | null
    entity: string | null
    entityId: number | null
    details: string | null
    ipAddress: string | null
    createdAt: Date | null
  }

  export type AuditLogCountAggregateOutputType = {
    id: number
    userId: number
    action: number
    entity: number
    entityId: number
    details: number
    ipAddress: number
    createdAt: number
    _all: number
  }


  export type AuditLogAvgAggregateInputType = {
    id?: true
    userId?: true
    entityId?: true
  }

  export type AuditLogSumAggregateInputType = {
    id?: true
    userId?: true
    entityId?: true
  }

  export type AuditLogMinAggregateInputType = {
    id?: true
    userId?: true
    action?: true
    entity?: true
    entityId?: true
    details?: true
    ipAddress?: true
    createdAt?: true
  }

  export type AuditLogMaxAggregateInputType = {
    id?: true
    userId?: true
    action?: true
    entity?: true
    entityId?: true
    details?: true
    ipAddress?: true
    createdAt?: true
  }

  export type AuditLogCountAggregateInputType = {
    id?: true
    userId?: true
    action?: true
    entity?: true
    entityId?: true
    details?: true
    ipAddress?: true
    createdAt?: true
    _all?: true
  }

  export type AuditLogAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLog to aggregate.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned AuditLogs
    **/
    _count?: true | AuditLogCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AuditLogAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AuditLogSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AuditLogMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AuditLogMaxAggregateInputType
  }

  export type GetAuditLogAggregateType<T extends AuditLogAggregateArgs> = {
        [P in keyof T & keyof AggregateAuditLog]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAuditLog[P]>
      : GetScalarType<T[P], AggregateAuditLog[P]>
  }




  export type AuditLogGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AuditLogWhereInput
    orderBy?: AuditLogOrderByWithAggregationInput | AuditLogOrderByWithAggregationInput[]
    by: AuditLogScalarFieldEnum[] | AuditLogScalarFieldEnum
    having?: AuditLogScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AuditLogCountAggregateInputType | true
    _avg?: AuditLogAvgAggregateInputType
    _sum?: AuditLogSumAggregateInputType
    _min?: AuditLogMinAggregateInputType
    _max?: AuditLogMaxAggregateInputType
  }

  export type AuditLogGroupByOutputType = {
    id: number
    userId: number | null
    action: $Enums.AuditAction
    entity: string
    entityId: number | null
    details: string | null
    ipAddress: string | null
    createdAt: Date
    _count: AuditLogCountAggregateOutputType | null
    _avg: AuditLogAvgAggregateOutputType | null
    _sum: AuditLogSumAggregateOutputType | null
    _min: AuditLogMinAggregateOutputType | null
    _max: AuditLogMaxAggregateOutputType | null
  }

  type GetAuditLogGroupByPayload<T extends AuditLogGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AuditLogGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AuditLogGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
            : GetScalarType<T[P], AuditLogGroupByOutputType[P]>
        }
      >
    >


  export type AuditLogSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    details?: boolean
    ipAddress?: boolean
    createdAt?: boolean
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }, ExtArgs["result"]["auditLog"]>



  export type AuditLogSelectScalar = {
    id?: boolean
    userId?: boolean
    action?: boolean
    entity?: boolean
    entityId?: boolean
    details?: boolean
    ipAddress?: boolean
    createdAt?: boolean
  }

  export type AuditLogOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "action" | "entity" | "entityId" | "details" | "ipAddress" | "createdAt", ExtArgs["result"]["auditLog"]>
  export type AuditLogInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | AuditLog$userArgs<ExtArgs>
  }

  export type $AuditLogPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "AuditLog"
    objects: {
      user: Prisma.$UserPayload<ExtArgs> | null
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number | null
      action: $Enums.AuditAction
      entity: string
      entityId: number | null
      details: string | null
      ipAddress: string | null
      createdAt: Date
    }, ExtArgs["result"]["auditLog"]>
    composites: {}
  }

  type AuditLogGetPayload<S extends boolean | null | undefined | AuditLogDefaultArgs> = $Result.GetResult<Prisma.$AuditLogPayload, S>

  type AuditLogCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AuditLogFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AuditLogCountAggregateInputType | true
    }

  export interface AuditLogDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['AuditLog'], meta: { name: 'AuditLog' } }
    /**
     * Find zero or one AuditLog that matches the filter.
     * @param {AuditLogFindUniqueArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AuditLogFindUniqueArgs>(args: SelectSubset<T, AuditLogFindUniqueArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one AuditLog that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AuditLogFindUniqueOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AuditLogFindUniqueOrThrowArgs>(args: SelectSubset<T, AuditLogFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AuditLogFindFirstArgs>(args?: SelectSubset<T, AuditLogFindFirstArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first AuditLog that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindFirstOrThrowArgs} args - Arguments to find a AuditLog
     * @example
     * // Get one AuditLog
     * const auditLog = await prisma.auditLog.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AuditLogFindFirstOrThrowArgs>(args?: SelectSubset<T, AuditLogFindFirstOrThrowArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more AuditLogs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all AuditLogs
     * const auditLogs = await prisma.auditLog.findMany()
     * 
     * // Get first 10 AuditLogs
     * const auditLogs = await prisma.auditLog.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const auditLogWithIdOnly = await prisma.auditLog.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AuditLogFindManyArgs>(args?: SelectSubset<T, AuditLogFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a AuditLog.
     * @param {AuditLogCreateArgs} args - Arguments to create a AuditLog.
     * @example
     * // Create one AuditLog
     * const AuditLog = await prisma.auditLog.create({
     *   data: {
     *     // ... data to create a AuditLog
     *   }
     * })
     * 
     */
    create<T extends AuditLogCreateArgs>(args: SelectSubset<T, AuditLogCreateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many AuditLogs.
     * @param {AuditLogCreateManyArgs} args - Arguments to create many AuditLogs.
     * @example
     * // Create many AuditLogs
     * const auditLog = await prisma.auditLog.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AuditLogCreateManyArgs>(args?: SelectSubset<T, AuditLogCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a AuditLog.
     * @param {AuditLogDeleteArgs} args - Arguments to delete one AuditLog.
     * @example
     * // Delete one AuditLog
     * const AuditLog = await prisma.auditLog.delete({
     *   where: {
     *     // ... filter to delete one AuditLog
     *   }
     * })
     * 
     */
    delete<T extends AuditLogDeleteArgs>(args: SelectSubset<T, AuditLogDeleteArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one AuditLog.
     * @param {AuditLogUpdateArgs} args - Arguments to update one AuditLog.
     * @example
     * // Update one AuditLog
     * const auditLog = await prisma.auditLog.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AuditLogUpdateArgs>(args: SelectSubset<T, AuditLogUpdateArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more AuditLogs.
     * @param {AuditLogDeleteManyArgs} args - Arguments to filter AuditLogs to delete.
     * @example
     * // Delete a few AuditLogs
     * const { count } = await prisma.auditLog.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AuditLogDeleteManyArgs>(args?: SelectSubset<T, AuditLogDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many AuditLogs
     * const auditLog = await prisma.auditLog.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AuditLogUpdateManyArgs>(args: SelectSubset<T, AuditLogUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one AuditLog.
     * @param {AuditLogUpsertArgs} args - Arguments to update or create a AuditLog.
     * @example
     * // Update or create a AuditLog
     * const auditLog = await prisma.auditLog.upsert({
     *   create: {
     *     // ... data to create a AuditLog
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the AuditLog we want to update
     *   }
     * })
     */
    upsert<T extends AuditLogUpsertArgs>(args: SelectSubset<T, AuditLogUpsertArgs<ExtArgs>>): Prisma__AuditLogClient<$Result.GetResult<Prisma.$AuditLogPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of AuditLogs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogCountArgs} args - Arguments to filter AuditLogs to count.
     * @example
     * // Count the number of AuditLogs
     * const count = await prisma.auditLog.count({
     *   where: {
     *     // ... the filter for the AuditLogs we want to count
     *   }
     * })
    **/
    count<T extends AuditLogCountArgs>(
      args?: Subset<T, AuditLogCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AuditLogCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AuditLogAggregateArgs>(args: Subset<T, AuditLogAggregateArgs>): Prisma.PrismaPromise<GetAuditLogAggregateType<T>>

    /**
     * Group by AuditLog.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AuditLogGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AuditLogGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AuditLogGroupByArgs['orderBy'] }
        : { orderBy?: AuditLogGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AuditLogGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAuditLogGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the AuditLog model
   */
  readonly fields: AuditLogFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for AuditLog.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AuditLogClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends AuditLog$userArgs<ExtArgs> = {}>(args?: Subset<T, AuditLog$userArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the AuditLog model
   */
  interface AuditLogFieldRefs {
    readonly id: FieldRef<"AuditLog", 'Int'>
    readonly userId: FieldRef<"AuditLog", 'Int'>
    readonly action: FieldRef<"AuditLog", 'AuditAction'>
    readonly entity: FieldRef<"AuditLog", 'String'>
    readonly entityId: FieldRef<"AuditLog", 'Int'>
    readonly details: FieldRef<"AuditLog", 'String'>
    readonly ipAddress: FieldRef<"AuditLog", 'String'>
    readonly createdAt: FieldRef<"AuditLog", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * AuditLog findUnique
   */
  export type AuditLogFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findUniqueOrThrow
   */
  export type AuditLogFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog findFirst
   */
  export type AuditLogFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findFirstOrThrow
   */
  export type AuditLogFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLog to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of AuditLogs.
     */
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog findMany
   */
  export type AuditLogFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter, which AuditLogs to fetch.
     */
    where?: AuditLogWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of AuditLogs to fetch.
     */
    orderBy?: AuditLogOrderByWithRelationInput | AuditLogOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing AuditLogs.
     */
    cursor?: AuditLogWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` AuditLogs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` AuditLogs.
     */
    skip?: number
    distinct?: AuditLogScalarFieldEnum | AuditLogScalarFieldEnum[]
  }

  /**
   * AuditLog create
   */
  export type AuditLogCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to create a AuditLog.
     */
    data: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
  }

  /**
   * AuditLog createMany
   */
  export type AuditLogCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many AuditLogs.
     */
    data: AuditLogCreateManyInput | AuditLogCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * AuditLog update
   */
  export type AuditLogUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The data needed to update a AuditLog.
     */
    data: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
    /**
     * Choose, which AuditLog to update.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog updateMany
   */
  export type AuditLogUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update AuditLogs.
     */
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyInput>
    /**
     * Filter which AuditLogs to update
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to update.
     */
    limit?: number
  }

  /**
   * AuditLog upsert
   */
  export type AuditLogUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * The filter to search for the AuditLog to update in case it exists.
     */
    where: AuditLogWhereUniqueInput
    /**
     * In case the AuditLog found by the `where` argument doesn't exist, create a new AuditLog with this data.
     */
    create: XOR<AuditLogCreateInput, AuditLogUncheckedCreateInput>
    /**
     * In case the AuditLog was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AuditLogUpdateInput, AuditLogUncheckedUpdateInput>
  }

  /**
   * AuditLog delete
   */
  export type AuditLogDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
    /**
     * Filter which AuditLog to delete.
     */
    where: AuditLogWhereUniqueInput
  }

  /**
   * AuditLog deleteMany
   */
  export type AuditLogDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which AuditLogs to delete
     */
    where?: AuditLogWhereInput
    /**
     * Limit how many AuditLogs to delete.
     */
    limit?: number
  }

  /**
   * AuditLog.user
   */
  export type AuditLog$userArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * AuditLog without action
   */
  export type AuditLogDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AuditLog
     */
    select?: AuditLogSelect<ExtArgs> | null
    /**
     * Omit specific fields from the AuditLog
     */
    omit?: AuditLogOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AuditLogInclude<ExtArgs> | null
  }


  /**
   * Model Session
   */

  export type AggregateSession = {
    _count: SessionCountAggregateOutputType | null
    _avg: SessionAvgAggregateOutputType | null
    _sum: SessionSumAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  export type SessionAvgAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type SessionSumAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type SessionMinAggregateOutputType = {
    id: number | null
    userId: number | null
    refreshToken: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type SessionMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    refreshToken: string | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type SessionCountAggregateOutputType = {
    id: number
    userId: number
    refreshToken: number
    expiresAt: number
    createdAt: number
    _all: number
  }


  export type SessionAvgAggregateInputType = {
    id?: true
    userId?: true
  }

  export type SessionSumAggregateInputType = {
    id?: true
    userId?: true
  }

  export type SessionMinAggregateInputType = {
    id?: true
    userId?: true
    refreshToken?: true
    expiresAt?: true
    createdAt?: true
  }

  export type SessionMaxAggregateInputType = {
    id?: true
    userId?: true
    refreshToken?: true
    expiresAt?: true
    createdAt?: true
  }

  export type SessionCountAggregateInputType = {
    id?: true
    userId?: true
    refreshToken?: true
    expiresAt?: true
    createdAt?: true
    _all?: true
  }

  export type SessionAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Session to aggregate.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Sessions
    **/
    _count?: true | SessionCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: SessionAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: SessionSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SessionMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SessionMaxAggregateInputType
  }

  export type GetSessionAggregateType<T extends SessionAggregateArgs> = {
        [P in keyof T & keyof AggregateSession]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSession[P]>
      : GetScalarType<T[P], AggregateSession[P]>
  }




  export type SessionGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SessionWhereInput
    orderBy?: SessionOrderByWithAggregationInput | SessionOrderByWithAggregationInput[]
    by: SessionScalarFieldEnum[] | SessionScalarFieldEnum
    having?: SessionScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SessionCountAggregateInputType | true
    _avg?: SessionAvgAggregateInputType
    _sum?: SessionSumAggregateInputType
    _min?: SessionMinAggregateInputType
    _max?: SessionMaxAggregateInputType
  }

  export type SessionGroupByOutputType = {
    id: number
    userId: number
    refreshToken: string
    expiresAt: Date
    createdAt: Date
    _count: SessionCountAggregateOutputType | null
    _avg: SessionAvgAggregateOutputType | null
    _sum: SessionSumAggregateOutputType | null
    _min: SessionMinAggregateOutputType | null
    _max: SessionMaxAggregateOutputType | null
  }

  type GetSessionGroupByPayload<T extends SessionGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SessionGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SessionGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SessionGroupByOutputType[P]>
            : GetScalarType<T[P], SessionGroupByOutputType[P]>
        }
      >
    >


  export type SessionSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    refreshToken?: boolean
    expiresAt?: boolean
    createdAt?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["session"]>



  export type SessionSelectScalar = {
    id?: boolean
    userId?: boolean
    refreshToken?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }

  export type SessionOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "refreshToken" | "expiresAt" | "createdAt", ExtArgs["result"]["session"]>
  export type SessionInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $SessionPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Session"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number
      refreshToken: string
      expiresAt: Date
      createdAt: Date
    }, ExtArgs["result"]["session"]>
    composites: {}
  }

  type SessionGetPayload<S extends boolean | null | undefined | SessionDefaultArgs> = $Result.GetResult<Prisma.$SessionPayload, S>

  type SessionCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SessionFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SessionCountAggregateInputType | true
    }

  export interface SessionDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Session'], meta: { name: 'Session' } }
    /**
     * Find zero or one Session that matches the filter.
     * @param {SessionFindUniqueArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SessionFindUniqueArgs>(args: SelectSubset<T, SessionFindUniqueArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Session that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SessionFindUniqueOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SessionFindUniqueOrThrowArgs>(args: SelectSubset<T, SessionFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SessionFindFirstArgs>(args?: SelectSubset<T, SessionFindFirstArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Session that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindFirstOrThrowArgs} args - Arguments to find a Session
     * @example
     * // Get one Session
     * const session = await prisma.session.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SessionFindFirstOrThrowArgs>(args?: SelectSubset<T, SessionFindFirstOrThrowArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Sessions that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Sessions
     * const sessions = await prisma.session.findMany()
     * 
     * // Get first 10 Sessions
     * const sessions = await prisma.session.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const sessionWithIdOnly = await prisma.session.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SessionFindManyArgs>(args?: SelectSubset<T, SessionFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Session.
     * @param {SessionCreateArgs} args - Arguments to create a Session.
     * @example
     * // Create one Session
     * const Session = await prisma.session.create({
     *   data: {
     *     // ... data to create a Session
     *   }
     * })
     * 
     */
    create<T extends SessionCreateArgs>(args: SelectSubset<T, SessionCreateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Sessions.
     * @param {SessionCreateManyArgs} args - Arguments to create many Sessions.
     * @example
     * // Create many Sessions
     * const session = await prisma.session.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SessionCreateManyArgs>(args?: SelectSubset<T, SessionCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Session.
     * @param {SessionDeleteArgs} args - Arguments to delete one Session.
     * @example
     * // Delete one Session
     * const Session = await prisma.session.delete({
     *   where: {
     *     // ... filter to delete one Session
     *   }
     * })
     * 
     */
    delete<T extends SessionDeleteArgs>(args: SelectSubset<T, SessionDeleteArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Session.
     * @param {SessionUpdateArgs} args - Arguments to update one Session.
     * @example
     * // Update one Session
     * const session = await prisma.session.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SessionUpdateArgs>(args: SelectSubset<T, SessionUpdateArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Sessions.
     * @param {SessionDeleteManyArgs} args - Arguments to filter Sessions to delete.
     * @example
     * // Delete a few Sessions
     * const { count } = await prisma.session.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SessionDeleteManyArgs>(args?: SelectSubset<T, SessionDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Sessions
     * const session = await prisma.session.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SessionUpdateManyArgs>(args: SelectSubset<T, SessionUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Session.
     * @param {SessionUpsertArgs} args - Arguments to update or create a Session.
     * @example
     * // Update or create a Session
     * const session = await prisma.session.upsert({
     *   create: {
     *     // ... data to create a Session
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Session we want to update
     *   }
     * })
     */
    upsert<T extends SessionUpsertArgs>(args: SelectSubset<T, SessionUpsertArgs<ExtArgs>>): Prisma__SessionClient<$Result.GetResult<Prisma.$SessionPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Sessions.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionCountArgs} args - Arguments to filter Sessions to count.
     * @example
     * // Count the number of Sessions
     * const count = await prisma.session.count({
     *   where: {
     *     // ... the filter for the Sessions we want to count
     *   }
     * })
    **/
    count<T extends SessionCountArgs>(
      args?: Subset<T, SessionCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SessionCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SessionAggregateArgs>(args: Subset<T, SessionAggregateArgs>): Prisma.PrismaPromise<GetSessionAggregateType<T>>

    /**
     * Group by Session.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SessionGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SessionGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SessionGroupByArgs['orderBy'] }
        : { orderBy?: SessionGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SessionGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSessionGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Session model
   */
  readonly fields: SessionFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Session.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SessionClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Session model
   */
  interface SessionFieldRefs {
    readonly id: FieldRef<"Session", 'Int'>
    readonly userId: FieldRef<"Session", 'Int'>
    readonly refreshToken: FieldRef<"Session", 'String'>
    readonly expiresAt: FieldRef<"Session", 'DateTime'>
    readonly createdAt: FieldRef<"Session", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Session findUnique
   */
  export type SessionFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findUniqueOrThrow
   */
  export type SessionFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session findFirst
   */
  export type SessionFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findFirstOrThrow
   */
  export type SessionFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Session to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Sessions.
     */
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session findMany
   */
  export type SessionFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter, which Sessions to fetch.
     */
    where?: SessionWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Sessions to fetch.
     */
    orderBy?: SessionOrderByWithRelationInput | SessionOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Sessions.
     */
    cursor?: SessionWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Sessions from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Sessions.
     */
    skip?: number
    distinct?: SessionScalarFieldEnum | SessionScalarFieldEnum[]
  }

  /**
   * Session create
   */
  export type SessionCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to create a Session.
     */
    data: XOR<SessionCreateInput, SessionUncheckedCreateInput>
  }

  /**
   * Session createMany
   */
  export type SessionCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Sessions.
     */
    data: SessionCreateManyInput | SessionCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Session update
   */
  export type SessionUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The data needed to update a Session.
     */
    data: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
    /**
     * Choose, which Session to update.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session updateMany
   */
  export type SessionUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Sessions.
     */
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyInput>
    /**
     * Filter which Sessions to update
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to update.
     */
    limit?: number
  }

  /**
   * Session upsert
   */
  export type SessionUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * The filter to search for the Session to update in case it exists.
     */
    where: SessionWhereUniqueInput
    /**
     * In case the Session found by the `where` argument doesn't exist, create a new Session with this data.
     */
    create: XOR<SessionCreateInput, SessionUncheckedCreateInput>
    /**
     * In case the Session was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SessionUpdateInput, SessionUncheckedUpdateInput>
  }

  /**
   * Session delete
   */
  export type SessionDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
    /**
     * Filter which Session to delete.
     */
    where: SessionWhereUniqueInput
  }

  /**
   * Session deleteMany
   */
  export type SessionDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Sessions to delete
     */
    where?: SessionWhereInput
    /**
     * Limit how many Sessions to delete.
     */
    limit?: number
  }

  /**
   * Session without action
   */
  export type SessionDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Session
     */
    select?: SessionSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Session
     */
    omit?: SessionOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SessionInclude<ExtArgs> | null
  }


  /**
   * Model DeviceToken
   */

  export type AggregateDeviceToken = {
    _count: DeviceTokenCountAggregateOutputType | null
    _avg: DeviceTokenAvgAggregateOutputType | null
    _sum: DeviceTokenSumAggregateOutputType | null
    _min: DeviceTokenMinAggregateOutputType | null
    _max: DeviceTokenMaxAggregateOutputType | null
  }

  export type DeviceTokenAvgAggregateOutputType = {
    id: number | null
  }

  export type DeviceTokenSumAggregateOutputType = {
    id: number | null
  }

  export type DeviceTokenMinAggregateOutputType = {
    id: number | null
    token: string | null
    settingsCode: string | null
    deviceId: string | null
    mac: string | null
    isUsed: boolean | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type DeviceTokenMaxAggregateOutputType = {
    id: number | null
    token: string | null
    settingsCode: string | null
    deviceId: string | null
    mac: string | null
    isUsed: boolean | null
    expiresAt: Date | null
    createdAt: Date | null
  }

  export type DeviceTokenCountAggregateOutputType = {
    id: number
    token: number
    settingsCode: number
    deviceId: number
    mac: number
    isUsed: number
    expiresAt: number
    createdAt: number
    _all: number
  }


  export type DeviceTokenAvgAggregateInputType = {
    id?: true
  }

  export type DeviceTokenSumAggregateInputType = {
    id?: true
  }

  export type DeviceTokenMinAggregateInputType = {
    id?: true
    token?: true
    settingsCode?: true
    deviceId?: true
    mac?: true
    isUsed?: true
    expiresAt?: true
    createdAt?: true
  }

  export type DeviceTokenMaxAggregateInputType = {
    id?: true
    token?: true
    settingsCode?: true
    deviceId?: true
    mac?: true
    isUsed?: true
    expiresAt?: true
    createdAt?: true
  }

  export type DeviceTokenCountAggregateInputType = {
    id?: true
    token?: true
    settingsCode?: true
    deviceId?: true
    mac?: true
    isUsed?: true
    expiresAt?: true
    createdAt?: true
    _all?: true
  }

  export type DeviceTokenAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DeviceToken to aggregate.
     */
    where?: DeviceTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceTokens to fetch.
     */
    orderBy?: DeviceTokenOrderByWithRelationInput | DeviceTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DeviceTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DeviceTokens
    **/
    _count?: true | DeviceTokenCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DeviceTokenAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DeviceTokenSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DeviceTokenMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DeviceTokenMaxAggregateInputType
  }

  export type GetDeviceTokenAggregateType<T extends DeviceTokenAggregateArgs> = {
        [P in keyof T & keyof AggregateDeviceToken]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDeviceToken[P]>
      : GetScalarType<T[P], AggregateDeviceToken[P]>
  }




  export type DeviceTokenGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DeviceTokenWhereInput
    orderBy?: DeviceTokenOrderByWithAggregationInput | DeviceTokenOrderByWithAggregationInput[]
    by: DeviceTokenScalarFieldEnum[] | DeviceTokenScalarFieldEnum
    having?: DeviceTokenScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DeviceTokenCountAggregateInputType | true
    _avg?: DeviceTokenAvgAggregateInputType
    _sum?: DeviceTokenSumAggregateInputType
    _min?: DeviceTokenMinAggregateInputType
    _max?: DeviceTokenMaxAggregateInputType
  }

  export type DeviceTokenGroupByOutputType = {
    id: number
    token: string
    settingsCode: string
    deviceId: string
    mac: string
    isUsed: boolean
    expiresAt: Date
    createdAt: Date
    _count: DeviceTokenCountAggregateOutputType | null
    _avg: DeviceTokenAvgAggregateOutputType | null
    _sum: DeviceTokenSumAggregateOutputType | null
    _min: DeviceTokenMinAggregateOutputType | null
    _max: DeviceTokenMaxAggregateOutputType | null
  }

  type GetDeviceTokenGroupByPayload<T extends DeviceTokenGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DeviceTokenGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DeviceTokenGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DeviceTokenGroupByOutputType[P]>
            : GetScalarType<T[P], DeviceTokenGroupByOutputType[P]>
        }
      >
    >


  export type DeviceTokenSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    token?: boolean
    settingsCode?: boolean
    deviceId?: boolean
    mac?: boolean
    isUsed?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["deviceToken"]>



  export type DeviceTokenSelectScalar = {
    id?: boolean
    token?: boolean
    settingsCode?: boolean
    deviceId?: boolean
    mac?: boolean
    isUsed?: boolean
    expiresAt?: boolean
    createdAt?: boolean
  }

  export type DeviceTokenOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "token" | "settingsCode" | "deviceId" | "mac" | "isUsed" | "expiresAt" | "createdAt", ExtArgs["result"]["deviceToken"]>

  export type $DeviceTokenPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DeviceToken"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      token: string
      settingsCode: string
      deviceId: string
      mac: string
      isUsed: boolean
      expiresAt: Date
      createdAt: Date
    }, ExtArgs["result"]["deviceToken"]>
    composites: {}
  }

  type DeviceTokenGetPayload<S extends boolean | null | undefined | DeviceTokenDefaultArgs> = $Result.GetResult<Prisma.$DeviceTokenPayload, S>

  type DeviceTokenCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DeviceTokenFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DeviceTokenCountAggregateInputType | true
    }

  export interface DeviceTokenDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DeviceToken'], meta: { name: 'DeviceToken' } }
    /**
     * Find zero or one DeviceToken that matches the filter.
     * @param {DeviceTokenFindUniqueArgs} args - Arguments to find a DeviceToken
     * @example
     * // Get one DeviceToken
     * const deviceToken = await prisma.deviceToken.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DeviceTokenFindUniqueArgs>(args: SelectSubset<T, DeviceTokenFindUniqueArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DeviceToken that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DeviceTokenFindUniqueOrThrowArgs} args - Arguments to find a DeviceToken
     * @example
     * // Get one DeviceToken
     * const deviceToken = await prisma.deviceToken.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DeviceTokenFindUniqueOrThrowArgs>(args: SelectSubset<T, DeviceTokenFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DeviceToken that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenFindFirstArgs} args - Arguments to find a DeviceToken
     * @example
     * // Get one DeviceToken
     * const deviceToken = await prisma.deviceToken.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DeviceTokenFindFirstArgs>(args?: SelectSubset<T, DeviceTokenFindFirstArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DeviceToken that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenFindFirstOrThrowArgs} args - Arguments to find a DeviceToken
     * @example
     * // Get one DeviceToken
     * const deviceToken = await prisma.deviceToken.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DeviceTokenFindFirstOrThrowArgs>(args?: SelectSubset<T, DeviceTokenFindFirstOrThrowArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DeviceTokens that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DeviceTokens
     * const deviceTokens = await prisma.deviceToken.findMany()
     * 
     * // Get first 10 DeviceTokens
     * const deviceTokens = await prisma.deviceToken.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const deviceTokenWithIdOnly = await prisma.deviceToken.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DeviceTokenFindManyArgs>(args?: SelectSubset<T, DeviceTokenFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DeviceToken.
     * @param {DeviceTokenCreateArgs} args - Arguments to create a DeviceToken.
     * @example
     * // Create one DeviceToken
     * const DeviceToken = await prisma.deviceToken.create({
     *   data: {
     *     // ... data to create a DeviceToken
     *   }
     * })
     * 
     */
    create<T extends DeviceTokenCreateArgs>(args: SelectSubset<T, DeviceTokenCreateArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DeviceTokens.
     * @param {DeviceTokenCreateManyArgs} args - Arguments to create many DeviceTokens.
     * @example
     * // Create many DeviceTokens
     * const deviceToken = await prisma.deviceToken.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DeviceTokenCreateManyArgs>(args?: SelectSubset<T, DeviceTokenCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a DeviceToken.
     * @param {DeviceTokenDeleteArgs} args - Arguments to delete one DeviceToken.
     * @example
     * // Delete one DeviceToken
     * const DeviceToken = await prisma.deviceToken.delete({
     *   where: {
     *     // ... filter to delete one DeviceToken
     *   }
     * })
     * 
     */
    delete<T extends DeviceTokenDeleteArgs>(args: SelectSubset<T, DeviceTokenDeleteArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DeviceToken.
     * @param {DeviceTokenUpdateArgs} args - Arguments to update one DeviceToken.
     * @example
     * // Update one DeviceToken
     * const deviceToken = await prisma.deviceToken.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DeviceTokenUpdateArgs>(args: SelectSubset<T, DeviceTokenUpdateArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DeviceTokens.
     * @param {DeviceTokenDeleteManyArgs} args - Arguments to filter DeviceTokens to delete.
     * @example
     * // Delete a few DeviceTokens
     * const { count } = await prisma.deviceToken.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DeviceTokenDeleteManyArgs>(args?: SelectSubset<T, DeviceTokenDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DeviceTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DeviceTokens
     * const deviceToken = await prisma.deviceToken.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DeviceTokenUpdateManyArgs>(args: SelectSubset<T, DeviceTokenUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one DeviceToken.
     * @param {DeviceTokenUpsertArgs} args - Arguments to update or create a DeviceToken.
     * @example
     * // Update or create a DeviceToken
     * const deviceToken = await prisma.deviceToken.upsert({
     *   create: {
     *     // ... data to create a DeviceToken
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DeviceToken we want to update
     *   }
     * })
     */
    upsert<T extends DeviceTokenUpsertArgs>(args: SelectSubset<T, DeviceTokenUpsertArgs<ExtArgs>>): Prisma__DeviceTokenClient<$Result.GetResult<Prisma.$DeviceTokenPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DeviceTokens.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenCountArgs} args - Arguments to filter DeviceTokens to count.
     * @example
     * // Count the number of DeviceTokens
     * const count = await prisma.deviceToken.count({
     *   where: {
     *     // ... the filter for the DeviceTokens we want to count
     *   }
     * })
    **/
    count<T extends DeviceTokenCountArgs>(
      args?: Subset<T, DeviceTokenCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DeviceTokenCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DeviceToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DeviceTokenAggregateArgs>(args: Subset<T, DeviceTokenAggregateArgs>): Prisma.PrismaPromise<GetDeviceTokenAggregateType<T>>

    /**
     * Group by DeviceToken.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceTokenGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DeviceTokenGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DeviceTokenGroupByArgs['orderBy'] }
        : { orderBy?: DeviceTokenGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DeviceTokenGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDeviceTokenGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DeviceToken model
   */
  readonly fields: DeviceTokenFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DeviceToken.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DeviceTokenClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DeviceToken model
   */
  interface DeviceTokenFieldRefs {
    readonly id: FieldRef<"DeviceToken", 'Int'>
    readonly token: FieldRef<"DeviceToken", 'String'>
    readonly settingsCode: FieldRef<"DeviceToken", 'String'>
    readonly deviceId: FieldRef<"DeviceToken", 'String'>
    readonly mac: FieldRef<"DeviceToken", 'String'>
    readonly isUsed: FieldRef<"DeviceToken", 'Boolean'>
    readonly expiresAt: FieldRef<"DeviceToken", 'DateTime'>
    readonly createdAt: FieldRef<"DeviceToken", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DeviceToken findUnique
   */
  export type DeviceTokenFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * Filter, which DeviceToken to fetch.
     */
    where: DeviceTokenWhereUniqueInput
  }

  /**
   * DeviceToken findUniqueOrThrow
   */
  export type DeviceTokenFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * Filter, which DeviceToken to fetch.
     */
    where: DeviceTokenWhereUniqueInput
  }

  /**
   * DeviceToken findFirst
   */
  export type DeviceTokenFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * Filter, which DeviceToken to fetch.
     */
    where?: DeviceTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceTokens to fetch.
     */
    orderBy?: DeviceTokenOrderByWithRelationInput | DeviceTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DeviceTokens.
     */
    cursor?: DeviceTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DeviceTokens.
     */
    distinct?: DeviceTokenScalarFieldEnum | DeviceTokenScalarFieldEnum[]
  }

  /**
   * DeviceToken findFirstOrThrow
   */
  export type DeviceTokenFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * Filter, which DeviceToken to fetch.
     */
    where?: DeviceTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceTokens to fetch.
     */
    orderBy?: DeviceTokenOrderByWithRelationInput | DeviceTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DeviceTokens.
     */
    cursor?: DeviceTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceTokens.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DeviceTokens.
     */
    distinct?: DeviceTokenScalarFieldEnum | DeviceTokenScalarFieldEnum[]
  }

  /**
   * DeviceToken findMany
   */
  export type DeviceTokenFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * Filter, which DeviceTokens to fetch.
     */
    where?: DeviceTokenWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceTokens to fetch.
     */
    orderBy?: DeviceTokenOrderByWithRelationInput | DeviceTokenOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DeviceTokens.
     */
    cursor?: DeviceTokenWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceTokens from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceTokens.
     */
    skip?: number
    distinct?: DeviceTokenScalarFieldEnum | DeviceTokenScalarFieldEnum[]
  }

  /**
   * DeviceToken create
   */
  export type DeviceTokenCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * The data needed to create a DeviceToken.
     */
    data: XOR<DeviceTokenCreateInput, DeviceTokenUncheckedCreateInput>
  }

  /**
   * DeviceToken createMany
   */
  export type DeviceTokenCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DeviceTokens.
     */
    data: DeviceTokenCreateManyInput | DeviceTokenCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DeviceToken update
   */
  export type DeviceTokenUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * The data needed to update a DeviceToken.
     */
    data: XOR<DeviceTokenUpdateInput, DeviceTokenUncheckedUpdateInput>
    /**
     * Choose, which DeviceToken to update.
     */
    where: DeviceTokenWhereUniqueInput
  }

  /**
   * DeviceToken updateMany
   */
  export type DeviceTokenUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DeviceTokens.
     */
    data: XOR<DeviceTokenUpdateManyMutationInput, DeviceTokenUncheckedUpdateManyInput>
    /**
     * Filter which DeviceTokens to update
     */
    where?: DeviceTokenWhereInput
    /**
     * Limit how many DeviceTokens to update.
     */
    limit?: number
  }

  /**
   * DeviceToken upsert
   */
  export type DeviceTokenUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * The filter to search for the DeviceToken to update in case it exists.
     */
    where: DeviceTokenWhereUniqueInput
    /**
     * In case the DeviceToken found by the `where` argument doesn't exist, create a new DeviceToken with this data.
     */
    create: XOR<DeviceTokenCreateInput, DeviceTokenUncheckedCreateInput>
    /**
     * In case the DeviceToken was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DeviceTokenUpdateInput, DeviceTokenUncheckedUpdateInput>
  }

  /**
   * DeviceToken delete
   */
  export type DeviceTokenDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
    /**
     * Filter which DeviceToken to delete.
     */
    where: DeviceTokenWhereUniqueInput
  }

  /**
   * DeviceToken deleteMany
   */
  export type DeviceTokenDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DeviceTokens to delete
     */
    where?: DeviceTokenWhereInput
    /**
     * Limit how many DeviceTokens to delete.
     */
    limit?: number
  }

  /**
   * DeviceToken without action
   */
  export type DeviceTokenDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceToken
     */
    select?: DeviceTokenSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceToken
     */
    omit?: DeviceTokenOmit<ExtArgs> | null
  }


  /**
   * Model DeviceBlacklist
   */

  export type AggregateDeviceBlacklist = {
    _count: DeviceBlacklistCountAggregateOutputType | null
    _avg: DeviceBlacklistAvgAggregateOutputType | null
    _sum: DeviceBlacklistSumAggregateOutputType | null
    _min: DeviceBlacklistMinAggregateOutputType | null
    _max: DeviceBlacklistMaxAggregateOutputType | null
  }

  export type DeviceBlacklistAvgAggregateOutputType = {
    id: number | null
  }

  export type DeviceBlacklistSumAggregateOutputType = {
    id: number | null
  }

  export type DeviceBlacklistMinAggregateOutputType = {
    id: number | null
    deviceId: string | null
    mac: string | null
    reason: $Enums.BlacklistReason | null
    details: string | null
    createdAt: Date | null
  }

  export type DeviceBlacklistMaxAggregateOutputType = {
    id: number | null
    deviceId: string | null
    mac: string | null
    reason: $Enums.BlacklistReason | null
    details: string | null
    createdAt: Date | null
  }

  export type DeviceBlacklistCountAggregateOutputType = {
    id: number
    deviceId: number
    mac: number
    reason: number
    details: number
    createdAt: number
    _all: number
  }


  export type DeviceBlacklistAvgAggregateInputType = {
    id?: true
  }

  export type DeviceBlacklistSumAggregateInputType = {
    id?: true
  }

  export type DeviceBlacklistMinAggregateInputType = {
    id?: true
    deviceId?: true
    mac?: true
    reason?: true
    details?: true
    createdAt?: true
  }

  export type DeviceBlacklistMaxAggregateInputType = {
    id?: true
    deviceId?: true
    mac?: true
    reason?: true
    details?: true
    createdAt?: true
  }

  export type DeviceBlacklistCountAggregateInputType = {
    id?: true
    deviceId?: true
    mac?: true
    reason?: true
    details?: true
    createdAt?: true
    _all?: true
  }

  export type DeviceBlacklistAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DeviceBlacklist to aggregate.
     */
    where?: DeviceBlacklistWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceBlacklists to fetch.
     */
    orderBy?: DeviceBlacklistOrderByWithRelationInput | DeviceBlacklistOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: DeviceBlacklistWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceBlacklists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceBlacklists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned DeviceBlacklists
    **/
    _count?: true | DeviceBlacklistCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: DeviceBlacklistAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: DeviceBlacklistSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: DeviceBlacklistMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: DeviceBlacklistMaxAggregateInputType
  }

  export type GetDeviceBlacklistAggregateType<T extends DeviceBlacklistAggregateArgs> = {
        [P in keyof T & keyof AggregateDeviceBlacklist]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateDeviceBlacklist[P]>
      : GetScalarType<T[P], AggregateDeviceBlacklist[P]>
  }




  export type DeviceBlacklistGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: DeviceBlacklistWhereInput
    orderBy?: DeviceBlacklistOrderByWithAggregationInput | DeviceBlacklistOrderByWithAggregationInput[]
    by: DeviceBlacklistScalarFieldEnum[] | DeviceBlacklistScalarFieldEnum
    having?: DeviceBlacklistScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: DeviceBlacklistCountAggregateInputType | true
    _avg?: DeviceBlacklistAvgAggregateInputType
    _sum?: DeviceBlacklistSumAggregateInputType
    _min?: DeviceBlacklistMinAggregateInputType
    _max?: DeviceBlacklistMaxAggregateInputType
  }

  export type DeviceBlacklistGroupByOutputType = {
    id: number
    deviceId: string | null
    mac: string | null
    reason: $Enums.BlacklistReason
    details: string | null
    createdAt: Date
    _count: DeviceBlacklistCountAggregateOutputType | null
    _avg: DeviceBlacklistAvgAggregateOutputType | null
    _sum: DeviceBlacklistSumAggregateOutputType | null
    _min: DeviceBlacklistMinAggregateOutputType | null
    _max: DeviceBlacklistMaxAggregateOutputType | null
  }

  type GetDeviceBlacklistGroupByPayload<T extends DeviceBlacklistGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<DeviceBlacklistGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof DeviceBlacklistGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], DeviceBlacklistGroupByOutputType[P]>
            : GetScalarType<T[P], DeviceBlacklistGroupByOutputType[P]>
        }
      >
    >


  export type DeviceBlacklistSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    deviceId?: boolean
    mac?: boolean
    reason?: boolean
    details?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["deviceBlacklist"]>



  export type DeviceBlacklistSelectScalar = {
    id?: boolean
    deviceId?: boolean
    mac?: boolean
    reason?: boolean
    details?: boolean
    createdAt?: boolean
  }

  export type DeviceBlacklistOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "deviceId" | "mac" | "reason" | "details" | "createdAt", ExtArgs["result"]["deviceBlacklist"]>

  export type $DeviceBlacklistPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "DeviceBlacklist"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      deviceId: string | null
      mac: string | null
      reason: $Enums.BlacklistReason
      details: string | null
      createdAt: Date
    }, ExtArgs["result"]["deviceBlacklist"]>
    composites: {}
  }

  type DeviceBlacklistGetPayload<S extends boolean | null | undefined | DeviceBlacklistDefaultArgs> = $Result.GetResult<Prisma.$DeviceBlacklistPayload, S>

  type DeviceBlacklistCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<DeviceBlacklistFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: DeviceBlacklistCountAggregateInputType | true
    }

  export interface DeviceBlacklistDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['DeviceBlacklist'], meta: { name: 'DeviceBlacklist' } }
    /**
     * Find zero or one DeviceBlacklist that matches the filter.
     * @param {DeviceBlacklistFindUniqueArgs} args - Arguments to find a DeviceBlacklist
     * @example
     * // Get one DeviceBlacklist
     * const deviceBlacklist = await prisma.deviceBlacklist.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends DeviceBlacklistFindUniqueArgs>(args: SelectSubset<T, DeviceBlacklistFindUniqueArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one DeviceBlacklist that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {DeviceBlacklistFindUniqueOrThrowArgs} args - Arguments to find a DeviceBlacklist
     * @example
     * // Get one DeviceBlacklist
     * const deviceBlacklist = await prisma.deviceBlacklist.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends DeviceBlacklistFindUniqueOrThrowArgs>(args: SelectSubset<T, DeviceBlacklistFindUniqueOrThrowArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DeviceBlacklist that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistFindFirstArgs} args - Arguments to find a DeviceBlacklist
     * @example
     * // Get one DeviceBlacklist
     * const deviceBlacklist = await prisma.deviceBlacklist.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends DeviceBlacklistFindFirstArgs>(args?: SelectSubset<T, DeviceBlacklistFindFirstArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first DeviceBlacklist that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistFindFirstOrThrowArgs} args - Arguments to find a DeviceBlacklist
     * @example
     * // Get one DeviceBlacklist
     * const deviceBlacklist = await prisma.deviceBlacklist.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends DeviceBlacklistFindFirstOrThrowArgs>(args?: SelectSubset<T, DeviceBlacklistFindFirstOrThrowArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more DeviceBlacklists that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all DeviceBlacklists
     * const deviceBlacklists = await prisma.deviceBlacklist.findMany()
     * 
     * // Get first 10 DeviceBlacklists
     * const deviceBlacklists = await prisma.deviceBlacklist.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const deviceBlacklistWithIdOnly = await prisma.deviceBlacklist.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends DeviceBlacklistFindManyArgs>(args?: SelectSubset<T, DeviceBlacklistFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a DeviceBlacklist.
     * @param {DeviceBlacklistCreateArgs} args - Arguments to create a DeviceBlacklist.
     * @example
     * // Create one DeviceBlacklist
     * const DeviceBlacklist = await prisma.deviceBlacklist.create({
     *   data: {
     *     // ... data to create a DeviceBlacklist
     *   }
     * })
     * 
     */
    create<T extends DeviceBlacklistCreateArgs>(args: SelectSubset<T, DeviceBlacklistCreateArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many DeviceBlacklists.
     * @param {DeviceBlacklistCreateManyArgs} args - Arguments to create many DeviceBlacklists.
     * @example
     * // Create many DeviceBlacklists
     * const deviceBlacklist = await prisma.deviceBlacklist.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends DeviceBlacklistCreateManyArgs>(args?: SelectSubset<T, DeviceBlacklistCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a DeviceBlacklist.
     * @param {DeviceBlacklistDeleteArgs} args - Arguments to delete one DeviceBlacklist.
     * @example
     * // Delete one DeviceBlacklist
     * const DeviceBlacklist = await prisma.deviceBlacklist.delete({
     *   where: {
     *     // ... filter to delete one DeviceBlacklist
     *   }
     * })
     * 
     */
    delete<T extends DeviceBlacklistDeleteArgs>(args: SelectSubset<T, DeviceBlacklistDeleteArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one DeviceBlacklist.
     * @param {DeviceBlacklistUpdateArgs} args - Arguments to update one DeviceBlacklist.
     * @example
     * // Update one DeviceBlacklist
     * const deviceBlacklist = await prisma.deviceBlacklist.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends DeviceBlacklistUpdateArgs>(args: SelectSubset<T, DeviceBlacklistUpdateArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more DeviceBlacklists.
     * @param {DeviceBlacklistDeleteManyArgs} args - Arguments to filter DeviceBlacklists to delete.
     * @example
     * // Delete a few DeviceBlacklists
     * const { count } = await prisma.deviceBlacklist.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends DeviceBlacklistDeleteManyArgs>(args?: SelectSubset<T, DeviceBlacklistDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more DeviceBlacklists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many DeviceBlacklists
     * const deviceBlacklist = await prisma.deviceBlacklist.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends DeviceBlacklistUpdateManyArgs>(args: SelectSubset<T, DeviceBlacklistUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one DeviceBlacklist.
     * @param {DeviceBlacklistUpsertArgs} args - Arguments to update or create a DeviceBlacklist.
     * @example
     * // Update or create a DeviceBlacklist
     * const deviceBlacklist = await prisma.deviceBlacklist.upsert({
     *   create: {
     *     // ... data to create a DeviceBlacklist
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the DeviceBlacklist we want to update
     *   }
     * })
     */
    upsert<T extends DeviceBlacklistUpsertArgs>(args: SelectSubset<T, DeviceBlacklistUpsertArgs<ExtArgs>>): Prisma__DeviceBlacklistClient<$Result.GetResult<Prisma.$DeviceBlacklistPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of DeviceBlacklists.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistCountArgs} args - Arguments to filter DeviceBlacklists to count.
     * @example
     * // Count the number of DeviceBlacklists
     * const count = await prisma.deviceBlacklist.count({
     *   where: {
     *     // ... the filter for the DeviceBlacklists we want to count
     *   }
     * })
    **/
    count<T extends DeviceBlacklistCountArgs>(
      args?: Subset<T, DeviceBlacklistCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], DeviceBlacklistCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a DeviceBlacklist.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends DeviceBlacklistAggregateArgs>(args: Subset<T, DeviceBlacklistAggregateArgs>): Prisma.PrismaPromise<GetDeviceBlacklistAggregateType<T>>

    /**
     * Group by DeviceBlacklist.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {DeviceBlacklistGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends DeviceBlacklistGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: DeviceBlacklistGroupByArgs['orderBy'] }
        : { orderBy?: DeviceBlacklistGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, DeviceBlacklistGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetDeviceBlacklistGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the DeviceBlacklist model
   */
  readonly fields: DeviceBlacklistFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for DeviceBlacklist.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__DeviceBlacklistClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the DeviceBlacklist model
   */
  interface DeviceBlacklistFieldRefs {
    readonly id: FieldRef<"DeviceBlacklist", 'Int'>
    readonly deviceId: FieldRef<"DeviceBlacklist", 'String'>
    readonly mac: FieldRef<"DeviceBlacklist", 'String'>
    readonly reason: FieldRef<"DeviceBlacklist", 'BlacklistReason'>
    readonly details: FieldRef<"DeviceBlacklist", 'String'>
    readonly createdAt: FieldRef<"DeviceBlacklist", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * DeviceBlacklist findUnique
   */
  export type DeviceBlacklistFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * Filter, which DeviceBlacklist to fetch.
     */
    where: DeviceBlacklistWhereUniqueInput
  }

  /**
   * DeviceBlacklist findUniqueOrThrow
   */
  export type DeviceBlacklistFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * Filter, which DeviceBlacklist to fetch.
     */
    where: DeviceBlacklistWhereUniqueInput
  }

  /**
   * DeviceBlacklist findFirst
   */
  export type DeviceBlacklistFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * Filter, which DeviceBlacklist to fetch.
     */
    where?: DeviceBlacklistWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceBlacklists to fetch.
     */
    orderBy?: DeviceBlacklistOrderByWithRelationInput | DeviceBlacklistOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DeviceBlacklists.
     */
    cursor?: DeviceBlacklistWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceBlacklists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceBlacklists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DeviceBlacklists.
     */
    distinct?: DeviceBlacklistScalarFieldEnum | DeviceBlacklistScalarFieldEnum[]
  }

  /**
   * DeviceBlacklist findFirstOrThrow
   */
  export type DeviceBlacklistFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * Filter, which DeviceBlacklist to fetch.
     */
    where?: DeviceBlacklistWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceBlacklists to fetch.
     */
    orderBy?: DeviceBlacklistOrderByWithRelationInput | DeviceBlacklistOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for DeviceBlacklists.
     */
    cursor?: DeviceBlacklistWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceBlacklists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceBlacklists.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of DeviceBlacklists.
     */
    distinct?: DeviceBlacklistScalarFieldEnum | DeviceBlacklistScalarFieldEnum[]
  }

  /**
   * DeviceBlacklist findMany
   */
  export type DeviceBlacklistFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * Filter, which DeviceBlacklists to fetch.
     */
    where?: DeviceBlacklistWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of DeviceBlacklists to fetch.
     */
    orderBy?: DeviceBlacklistOrderByWithRelationInput | DeviceBlacklistOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing DeviceBlacklists.
     */
    cursor?: DeviceBlacklistWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` DeviceBlacklists from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` DeviceBlacklists.
     */
    skip?: number
    distinct?: DeviceBlacklistScalarFieldEnum | DeviceBlacklistScalarFieldEnum[]
  }

  /**
   * DeviceBlacklist create
   */
  export type DeviceBlacklistCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * The data needed to create a DeviceBlacklist.
     */
    data: XOR<DeviceBlacklistCreateInput, DeviceBlacklistUncheckedCreateInput>
  }

  /**
   * DeviceBlacklist createMany
   */
  export type DeviceBlacklistCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many DeviceBlacklists.
     */
    data: DeviceBlacklistCreateManyInput | DeviceBlacklistCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * DeviceBlacklist update
   */
  export type DeviceBlacklistUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * The data needed to update a DeviceBlacklist.
     */
    data: XOR<DeviceBlacklistUpdateInput, DeviceBlacklistUncheckedUpdateInput>
    /**
     * Choose, which DeviceBlacklist to update.
     */
    where: DeviceBlacklistWhereUniqueInput
  }

  /**
   * DeviceBlacklist updateMany
   */
  export type DeviceBlacklistUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update DeviceBlacklists.
     */
    data: XOR<DeviceBlacklistUpdateManyMutationInput, DeviceBlacklistUncheckedUpdateManyInput>
    /**
     * Filter which DeviceBlacklists to update
     */
    where?: DeviceBlacklistWhereInput
    /**
     * Limit how many DeviceBlacklists to update.
     */
    limit?: number
  }

  /**
   * DeviceBlacklist upsert
   */
  export type DeviceBlacklistUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * The filter to search for the DeviceBlacklist to update in case it exists.
     */
    where: DeviceBlacklistWhereUniqueInput
    /**
     * In case the DeviceBlacklist found by the `where` argument doesn't exist, create a new DeviceBlacklist with this data.
     */
    create: XOR<DeviceBlacklistCreateInput, DeviceBlacklistUncheckedCreateInput>
    /**
     * In case the DeviceBlacklist was found with the provided `where` argument, update it with this data.
     */
    update: XOR<DeviceBlacklistUpdateInput, DeviceBlacklistUncheckedUpdateInput>
  }

  /**
   * DeviceBlacklist delete
   */
  export type DeviceBlacklistDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
    /**
     * Filter which DeviceBlacklist to delete.
     */
    where: DeviceBlacklistWhereUniqueInput
  }

  /**
   * DeviceBlacklist deleteMany
   */
  export type DeviceBlacklistDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which DeviceBlacklists to delete
     */
    where?: DeviceBlacklistWhereInput
    /**
     * Limit how many DeviceBlacklists to delete.
     */
    limit?: number
  }

  /**
   * DeviceBlacklist without action
   */
  export type DeviceBlacklistDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the DeviceBlacklist
     */
    select?: DeviceBlacklistSelect<ExtArgs> | null
    /**
     * Omit specific fields from the DeviceBlacklist
     */
    omit?: DeviceBlacklistOmit<ExtArgs> | null
  }


  /**
   * Model PlaybackActivity
   */

  export type AggregatePlaybackActivity = {
    _count: PlaybackActivityCountAggregateOutputType | null
    _avg: PlaybackActivityAvgAggregateOutputType | null
    _sum: PlaybackActivitySumAggregateOutputType | null
    _min: PlaybackActivityMinAggregateOutputType | null
    _max: PlaybackActivityMaxAggregateOutputType | null
  }

  export type PlaybackActivityAvgAggregateOutputType = {
    id: number | null
  }

  export type PlaybackActivitySumAggregateOutputType = {
    id: number | null
  }

  export type PlaybackActivityMinAggregateOutputType = {
    id: number | null
    movieId: string | null
    type: string | null
    profileId: string | null
    status: string | null
    timestamp: Date | null
  }

  export type PlaybackActivityMaxAggregateOutputType = {
    id: number | null
    movieId: string | null
    type: string | null
    profileId: string | null
    status: string | null
    timestamp: Date | null
  }

  export type PlaybackActivityCountAggregateOutputType = {
    id: number
    movieId: number
    type: number
    profileId: number
    status: number
    timestamp: number
    _all: number
  }


  export type PlaybackActivityAvgAggregateInputType = {
    id?: true
  }

  export type PlaybackActivitySumAggregateInputType = {
    id?: true
  }

  export type PlaybackActivityMinAggregateInputType = {
    id?: true
    movieId?: true
    type?: true
    profileId?: true
    status?: true
    timestamp?: true
  }

  export type PlaybackActivityMaxAggregateInputType = {
    id?: true
    movieId?: true
    type?: true
    profileId?: true
    status?: true
    timestamp?: true
  }

  export type PlaybackActivityCountAggregateInputType = {
    id?: true
    movieId?: true
    type?: true
    profileId?: true
    status?: true
    timestamp?: true
    _all?: true
  }

  export type PlaybackActivityAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlaybackActivity to aggregate.
     */
    where?: PlaybackActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaybackActivities to fetch.
     */
    orderBy?: PlaybackActivityOrderByWithRelationInput | PlaybackActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: PlaybackActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaybackActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaybackActivities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned PlaybackActivities
    **/
    _count?: true | PlaybackActivityCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: PlaybackActivityAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: PlaybackActivitySumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: PlaybackActivityMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: PlaybackActivityMaxAggregateInputType
  }

  export type GetPlaybackActivityAggregateType<T extends PlaybackActivityAggregateArgs> = {
        [P in keyof T & keyof AggregatePlaybackActivity]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregatePlaybackActivity[P]>
      : GetScalarType<T[P], AggregatePlaybackActivity[P]>
  }




  export type PlaybackActivityGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: PlaybackActivityWhereInput
    orderBy?: PlaybackActivityOrderByWithAggregationInput | PlaybackActivityOrderByWithAggregationInput[]
    by: PlaybackActivityScalarFieldEnum[] | PlaybackActivityScalarFieldEnum
    having?: PlaybackActivityScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: PlaybackActivityCountAggregateInputType | true
    _avg?: PlaybackActivityAvgAggregateInputType
    _sum?: PlaybackActivitySumAggregateInputType
    _min?: PlaybackActivityMinAggregateInputType
    _max?: PlaybackActivityMaxAggregateInputType
  }

  export type PlaybackActivityGroupByOutputType = {
    id: number
    movieId: string
    type: string
    profileId: string | null
    status: string
    timestamp: Date
    _count: PlaybackActivityCountAggregateOutputType | null
    _avg: PlaybackActivityAvgAggregateOutputType | null
    _sum: PlaybackActivitySumAggregateOutputType | null
    _min: PlaybackActivityMinAggregateOutputType | null
    _max: PlaybackActivityMaxAggregateOutputType | null
  }

  type GetPlaybackActivityGroupByPayload<T extends PlaybackActivityGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<PlaybackActivityGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof PlaybackActivityGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], PlaybackActivityGroupByOutputType[P]>
            : GetScalarType<T[P], PlaybackActivityGroupByOutputType[P]>
        }
      >
    >


  export type PlaybackActivitySelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    movieId?: boolean
    type?: boolean
    profileId?: boolean
    status?: boolean
    timestamp?: boolean
  }, ExtArgs["result"]["playbackActivity"]>



  export type PlaybackActivitySelectScalar = {
    id?: boolean
    movieId?: boolean
    type?: boolean
    profileId?: boolean
    status?: boolean
    timestamp?: boolean
  }

  export type PlaybackActivityOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "movieId" | "type" | "profileId" | "status" | "timestamp", ExtArgs["result"]["playbackActivity"]>

  export type $PlaybackActivityPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "PlaybackActivity"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      movieId: string
      type: string
      profileId: string | null
      status: string
      timestamp: Date
    }, ExtArgs["result"]["playbackActivity"]>
    composites: {}
  }

  type PlaybackActivityGetPayload<S extends boolean | null | undefined | PlaybackActivityDefaultArgs> = $Result.GetResult<Prisma.$PlaybackActivityPayload, S>

  type PlaybackActivityCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<PlaybackActivityFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: PlaybackActivityCountAggregateInputType | true
    }

  export interface PlaybackActivityDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['PlaybackActivity'], meta: { name: 'PlaybackActivity' } }
    /**
     * Find zero or one PlaybackActivity that matches the filter.
     * @param {PlaybackActivityFindUniqueArgs} args - Arguments to find a PlaybackActivity
     * @example
     * // Get one PlaybackActivity
     * const playbackActivity = await prisma.playbackActivity.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends PlaybackActivityFindUniqueArgs>(args: SelectSubset<T, PlaybackActivityFindUniqueArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one PlaybackActivity that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {PlaybackActivityFindUniqueOrThrowArgs} args - Arguments to find a PlaybackActivity
     * @example
     * // Get one PlaybackActivity
     * const playbackActivity = await prisma.playbackActivity.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends PlaybackActivityFindUniqueOrThrowArgs>(args: SelectSubset<T, PlaybackActivityFindUniqueOrThrowArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PlaybackActivity that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityFindFirstArgs} args - Arguments to find a PlaybackActivity
     * @example
     * // Get one PlaybackActivity
     * const playbackActivity = await prisma.playbackActivity.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends PlaybackActivityFindFirstArgs>(args?: SelectSubset<T, PlaybackActivityFindFirstArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first PlaybackActivity that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityFindFirstOrThrowArgs} args - Arguments to find a PlaybackActivity
     * @example
     * // Get one PlaybackActivity
     * const playbackActivity = await prisma.playbackActivity.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends PlaybackActivityFindFirstOrThrowArgs>(args?: SelectSubset<T, PlaybackActivityFindFirstOrThrowArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more PlaybackActivities that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all PlaybackActivities
     * const playbackActivities = await prisma.playbackActivity.findMany()
     * 
     * // Get first 10 PlaybackActivities
     * const playbackActivities = await prisma.playbackActivity.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const playbackActivityWithIdOnly = await prisma.playbackActivity.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends PlaybackActivityFindManyArgs>(args?: SelectSubset<T, PlaybackActivityFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a PlaybackActivity.
     * @param {PlaybackActivityCreateArgs} args - Arguments to create a PlaybackActivity.
     * @example
     * // Create one PlaybackActivity
     * const PlaybackActivity = await prisma.playbackActivity.create({
     *   data: {
     *     // ... data to create a PlaybackActivity
     *   }
     * })
     * 
     */
    create<T extends PlaybackActivityCreateArgs>(args: SelectSubset<T, PlaybackActivityCreateArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many PlaybackActivities.
     * @param {PlaybackActivityCreateManyArgs} args - Arguments to create many PlaybackActivities.
     * @example
     * // Create many PlaybackActivities
     * const playbackActivity = await prisma.playbackActivity.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends PlaybackActivityCreateManyArgs>(args?: SelectSubset<T, PlaybackActivityCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a PlaybackActivity.
     * @param {PlaybackActivityDeleteArgs} args - Arguments to delete one PlaybackActivity.
     * @example
     * // Delete one PlaybackActivity
     * const PlaybackActivity = await prisma.playbackActivity.delete({
     *   where: {
     *     // ... filter to delete one PlaybackActivity
     *   }
     * })
     * 
     */
    delete<T extends PlaybackActivityDeleteArgs>(args: SelectSubset<T, PlaybackActivityDeleteArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one PlaybackActivity.
     * @param {PlaybackActivityUpdateArgs} args - Arguments to update one PlaybackActivity.
     * @example
     * // Update one PlaybackActivity
     * const playbackActivity = await prisma.playbackActivity.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends PlaybackActivityUpdateArgs>(args: SelectSubset<T, PlaybackActivityUpdateArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more PlaybackActivities.
     * @param {PlaybackActivityDeleteManyArgs} args - Arguments to filter PlaybackActivities to delete.
     * @example
     * // Delete a few PlaybackActivities
     * const { count } = await prisma.playbackActivity.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends PlaybackActivityDeleteManyArgs>(args?: SelectSubset<T, PlaybackActivityDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more PlaybackActivities.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many PlaybackActivities
     * const playbackActivity = await prisma.playbackActivity.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends PlaybackActivityUpdateManyArgs>(args: SelectSubset<T, PlaybackActivityUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one PlaybackActivity.
     * @param {PlaybackActivityUpsertArgs} args - Arguments to update or create a PlaybackActivity.
     * @example
     * // Update or create a PlaybackActivity
     * const playbackActivity = await prisma.playbackActivity.upsert({
     *   create: {
     *     // ... data to create a PlaybackActivity
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the PlaybackActivity we want to update
     *   }
     * })
     */
    upsert<T extends PlaybackActivityUpsertArgs>(args: SelectSubset<T, PlaybackActivityUpsertArgs<ExtArgs>>): Prisma__PlaybackActivityClient<$Result.GetResult<Prisma.$PlaybackActivityPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of PlaybackActivities.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityCountArgs} args - Arguments to filter PlaybackActivities to count.
     * @example
     * // Count the number of PlaybackActivities
     * const count = await prisma.playbackActivity.count({
     *   where: {
     *     // ... the filter for the PlaybackActivities we want to count
     *   }
     * })
    **/
    count<T extends PlaybackActivityCountArgs>(
      args?: Subset<T, PlaybackActivityCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], PlaybackActivityCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a PlaybackActivity.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends PlaybackActivityAggregateArgs>(args: Subset<T, PlaybackActivityAggregateArgs>): Prisma.PrismaPromise<GetPlaybackActivityAggregateType<T>>

    /**
     * Group by PlaybackActivity.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {PlaybackActivityGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends PlaybackActivityGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: PlaybackActivityGroupByArgs['orderBy'] }
        : { orderBy?: PlaybackActivityGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, PlaybackActivityGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlaybackActivityGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the PlaybackActivity model
   */
  readonly fields: PlaybackActivityFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for PlaybackActivity.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__PlaybackActivityClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the PlaybackActivity model
   */
  interface PlaybackActivityFieldRefs {
    readonly id: FieldRef<"PlaybackActivity", 'Int'>
    readonly movieId: FieldRef<"PlaybackActivity", 'String'>
    readonly type: FieldRef<"PlaybackActivity", 'String'>
    readonly profileId: FieldRef<"PlaybackActivity", 'String'>
    readonly status: FieldRef<"PlaybackActivity", 'String'>
    readonly timestamp: FieldRef<"PlaybackActivity", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * PlaybackActivity findUnique
   */
  export type PlaybackActivityFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * Filter, which PlaybackActivity to fetch.
     */
    where: PlaybackActivityWhereUniqueInput
  }

  /**
   * PlaybackActivity findUniqueOrThrow
   */
  export type PlaybackActivityFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * Filter, which PlaybackActivity to fetch.
     */
    where: PlaybackActivityWhereUniqueInput
  }

  /**
   * PlaybackActivity findFirst
   */
  export type PlaybackActivityFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * Filter, which PlaybackActivity to fetch.
     */
    where?: PlaybackActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaybackActivities to fetch.
     */
    orderBy?: PlaybackActivityOrderByWithRelationInput | PlaybackActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlaybackActivities.
     */
    cursor?: PlaybackActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaybackActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaybackActivities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlaybackActivities.
     */
    distinct?: PlaybackActivityScalarFieldEnum | PlaybackActivityScalarFieldEnum[]
  }

  /**
   * PlaybackActivity findFirstOrThrow
   */
  export type PlaybackActivityFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * Filter, which PlaybackActivity to fetch.
     */
    where?: PlaybackActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaybackActivities to fetch.
     */
    orderBy?: PlaybackActivityOrderByWithRelationInput | PlaybackActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for PlaybackActivities.
     */
    cursor?: PlaybackActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaybackActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaybackActivities.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of PlaybackActivities.
     */
    distinct?: PlaybackActivityScalarFieldEnum | PlaybackActivityScalarFieldEnum[]
  }

  /**
   * PlaybackActivity findMany
   */
  export type PlaybackActivityFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * Filter, which PlaybackActivities to fetch.
     */
    where?: PlaybackActivityWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of PlaybackActivities to fetch.
     */
    orderBy?: PlaybackActivityOrderByWithRelationInput | PlaybackActivityOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing PlaybackActivities.
     */
    cursor?: PlaybackActivityWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` PlaybackActivities from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` PlaybackActivities.
     */
    skip?: number
    distinct?: PlaybackActivityScalarFieldEnum | PlaybackActivityScalarFieldEnum[]
  }

  /**
   * PlaybackActivity create
   */
  export type PlaybackActivityCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * The data needed to create a PlaybackActivity.
     */
    data: XOR<PlaybackActivityCreateInput, PlaybackActivityUncheckedCreateInput>
  }

  /**
   * PlaybackActivity createMany
   */
  export type PlaybackActivityCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many PlaybackActivities.
     */
    data: PlaybackActivityCreateManyInput | PlaybackActivityCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * PlaybackActivity update
   */
  export type PlaybackActivityUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * The data needed to update a PlaybackActivity.
     */
    data: XOR<PlaybackActivityUpdateInput, PlaybackActivityUncheckedUpdateInput>
    /**
     * Choose, which PlaybackActivity to update.
     */
    where: PlaybackActivityWhereUniqueInput
  }

  /**
   * PlaybackActivity updateMany
   */
  export type PlaybackActivityUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update PlaybackActivities.
     */
    data: XOR<PlaybackActivityUpdateManyMutationInput, PlaybackActivityUncheckedUpdateManyInput>
    /**
     * Filter which PlaybackActivities to update
     */
    where?: PlaybackActivityWhereInput
    /**
     * Limit how many PlaybackActivities to update.
     */
    limit?: number
  }

  /**
   * PlaybackActivity upsert
   */
  export type PlaybackActivityUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * The filter to search for the PlaybackActivity to update in case it exists.
     */
    where: PlaybackActivityWhereUniqueInput
    /**
     * In case the PlaybackActivity found by the `where` argument doesn't exist, create a new PlaybackActivity with this data.
     */
    create: XOR<PlaybackActivityCreateInput, PlaybackActivityUncheckedCreateInput>
    /**
     * In case the PlaybackActivity was found with the provided `where` argument, update it with this data.
     */
    update: XOR<PlaybackActivityUpdateInput, PlaybackActivityUncheckedUpdateInput>
  }

  /**
   * PlaybackActivity delete
   */
  export type PlaybackActivityDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
    /**
     * Filter which PlaybackActivity to delete.
     */
    where: PlaybackActivityWhereUniqueInput
  }

  /**
   * PlaybackActivity deleteMany
   */
  export type PlaybackActivityDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which PlaybackActivities to delete
     */
    where?: PlaybackActivityWhereInput
    /**
     * Limit how many PlaybackActivities to delete.
     */
    limit?: number
  }

  /**
   * PlaybackActivity without action
   */
  export type PlaybackActivityDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the PlaybackActivity
     */
    select?: PlaybackActivitySelect<ExtArgs> | null
    /**
     * Omit specific fields from the PlaybackActivity
     */
    omit?: PlaybackActivityOmit<ExtArgs> | null
  }


  /**
   * Model ResumeProgress
   */

  export type AggregateResumeProgress = {
    _count: ResumeProgressCountAggregateOutputType | null
    _avg: ResumeProgressAvgAggregateOutputType | null
    _sum: ResumeProgressSumAggregateOutputType | null
    _min: ResumeProgressMinAggregateOutputType | null
    _max: ResumeProgressMaxAggregateOutputType | null
  }

  export type ResumeProgressAvgAggregateOutputType = {
    id: number | null
    progressMs: number | null
    durationMs: number | null
  }

  export type ResumeProgressSumAggregateOutputType = {
    id: number | null
    progressMs: number | null
    durationMs: number | null
  }

  export type ResumeProgressMinAggregateOutputType = {
    id: number | null
    profileId: string | null
    contentId: string | null
    progressMs: number | null
    durationMs: number | null
    lastUpdated: Date | null
  }

  export type ResumeProgressMaxAggregateOutputType = {
    id: number | null
    profileId: string | null
    contentId: string | null
    progressMs: number | null
    durationMs: number | null
    lastUpdated: Date | null
  }

  export type ResumeProgressCountAggregateOutputType = {
    id: number
    profileId: number
    contentId: number
    progressMs: number
    durationMs: number
    lastUpdated: number
    _all: number
  }


  export type ResumeProgressAvgAggregateInputType = {
    id?: true
    progressMs?: true
    durationMs?: true
  }

  export type ResumeProgressSumAggregateInputType = {
    id?: true
    progressMs?: true
    durationMs?: true
  }

  export type ResumeProgressMinAggregateInputType = {
    id?: true
    profileId?: true
    contentId?: true
    progressMs?: true
    durationMs?: true
    lastUpdated?: true
  }

  export type ResumeProgressMaxAggregateInputType = {
    id?: true
    profileId?: true
    contentId?: true
    progressMs?: true
    durationMs?: true
    lastUpdated?: true
  }

  export type ResumeProgressCountAggregateInputType = {
    id?: true
    profileId?: true
    contentId?: true
    progressMs?: true
    durationMs?: true
    lastUpdated?: true
    _all?: true
  }

  export type ResumeProgressAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ResumeProgress to aggregate.
     */
    where?: ResumeProgressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ResumeProgresses to fetch.
     */
    orderBy?: ResumeProgressOrderByWithRelationInput | ResumeProgressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ResumeProgressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ResumeProgresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ResumeProgresses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ResumeProgresses
    **/
    _count?: true | ResumeProgressCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ResumeProgressAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ResumeProgressSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ResumeProgressMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ResumeProgressMaxAggregateInputType
  }

  export type GetResumeProgressAggregateType<T extends ResumeProgressAggregateArgs> = {
        [P in keyof T & keyof AggregateResumeProgress]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateResumeProgress[P]>
      : GetScalarType<T[P], AggregateResumeProgress[P]>
  }




  export type ResumeProgressGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ResumeProgressWhereInput
    orderBy?: ResumeProgressOrderByWithAggregationInput | ResumeProgressOrderByWithAggregationInput[]
    by: ResumeProgressScalarFieldEnum[] | ResumeProgressScalarFieldEnum
    having?: ResumeProgressScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ResumeProgressCountAggregateInputType | true
    _avg?: ResumeProgressAvgAggregateInputType
    _sum?: ResumeProgressSumAggregateInputType
    _min?: ResumeProgressMinAggregateInputType
    _max?: ResumeProgressMaxAggregateInputType
  }

  export type ResumeProgressGroupByOutputType = {
    id: number
    profileId: string
    contentId: string
    progressMs: number
    durationMs: number
    lastUpdated: Date
    _count: ResumeProgressCountAggregateOutputType | null
    _avg: ResumeProgressAvgAggregateOutputType | null
    _sum: ResumeProgressSumAggregateOutputType | null
    _min: ResumeProgressMinAggregateOutputType | null
    _max: ResumeProgressMaxAggregateOutputType | null
  }

  type GetResumeProgressGroupByPayload<T extends ResumeProgressGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ResumeProgressGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ResumeProgressGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ResumeProgressGroupByOutputType[P]>
            : GetScalarType<T[P], ResumeProgressGroupByOutputType[P]>
        }
      >
    >


  export type ResumeProgressSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    profileId?: boolean
    contentId?: boolean
    progressMs?: boolean
    durationMs?: boolean
    lastUpdated?: boolean
  }, ExtArgs["result"]["resumeProgress"]>



  export type ResumeProgressSelectScalar = {
    id?: boolean
    profileId?: boolean
    contentId?: boolean
    progressMs?: boolean
    durationMs?: boolean
    lastUpdated?: boolean
  }

  export type ResumeProgressOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "profileId" | "contentId" | "progressMs" | "durationMs" | "lastUpdated", ExtArgs["result"]["resumeProgress"]>

  export type $ResumeProgressPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ResumeProgress"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      profileId: string
      contentId: string
      progressMs: number
      durationMs: number
      lastUpdated: Date
    }, ExtArgs["result"]["resumeProgress"]>
    composites: {}
  }

  type ResumeProgressGetPayload<S extends boolean | null | undefined | ResumeProgressDefaultArgs> = $Result.GetResult<Prisma.$ResumeProgressPayload, S>

  type ResumeProgressCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ResumeProgressFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ResumeProgressCountAggregateInputType | true
    }

  export interface ResumeProgressDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ResumeProgress'], meta: { name: 'ResumeProgress' } }
    /**
     * Find zero or one ResumeProgress that matches the filter.
     * @param {ResumeProgressFindUniqueArgs} args - Arguments to find a ResumeProgress
     * @example
     * // Get one ResumeProgress
     * const resumeProgress = await prisma.resumeProgress.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ResumeProgressFindUniqueArgs>(args: SelectSubset<T, ResumeProgressFindUniqueArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ResumeProgress that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ResumeProgressFindUniqueOrThrowArgs} args - Arguments to find a ResumeProgress
     * @example
     * // Get one ResumeProgress
     * const resumeProgress = await prisma.resumeProgress.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ResumeProgressFindUniqueOrThrowArgs>(args: SelectSubset<T, ResumeProgressFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ResumeProgress that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressFindFirstArgs} args - Arguments to find a ResumeProgress
     * @example
     * // Get one ResumeProgress
     * const resumeProgress = await prisma.resumeProgress.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ResumeProgressFindFirstArgs>(args?: SelectSubset<T, ResumeProgressFindFirstArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ResumeProgress that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressFindFirstOrThrowArgs} args - Arguments to find a ResumeProgress
     * @example
     * // Get one ResumeProgress
     * const resumeProgress = await prisma.resumeProgress.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ResumeProgressFindFirstOrThrowArgs>(args?: SelectSubset<T, ResumeProgressFindFirstOrThrowArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ResumeProgresses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ResumeProgresses
     * const resumeProgresses = await prisma.resumeProgress.findMany()
     * 
     * // Get first 10 ResumeProgresses
     * const resumeProgresses = await prisma.resumeProgress.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const resumeProgressWithIdOnly = await prisma.resumeProgress.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ResumeProgressFindManyArgs>(args?: SelectSubset<T, ResumeProgressFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ResumeProgress.
     * @param {ResumeProgressCreateArgs} args - Arguments to create a ResumeProgress.
     * @example
     * // Create one ResumeProgress
     * const ResumeProgress = await prisma.resumeProgress.create({
     *   data: {
     *     // ... data to create a ResumeProgress
     *   }
     * })
     * 
     */
    create<T extends ResumeProgressCreateArgs>(args: SelectSubset<T, ResumeProgressCreateArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ResumeProgresses.
     * @param {ResumeProgressCreateManyArgs} args - Arguments to create many ResumeProgresses.
     * @example
     * // Create many ResumeProgresses
     * const resumeProgress = await prisma.resumeProgress.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ResumeProgressCreateManyArgs>(args?: SelectSubset<T, ResumeProgressCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ResumeProgress.
     * @param {ResumeProgressDeleteArgs} args - Arguments to delete one ResumeProgress.
     * @example
     * // Delete one ResumeProgress
     * const ResumeProgress = await prisma.resumeProgress.delete({
     *   where: {
     *     // ... filter to delete one ResumeProgress
     *   }
     * })
     * 
     */
    delete<T extends ResumeProgressDeleteArgs>(args: SelectSubset<T, ResumeProgressDeleteArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ResumeProgress.
     * @param {ResumeProgressUpdateArgs} args - Arguments to update one ResumeProgress.
     * @example
     * // Update one ResumeProgress
     * const resumeProgress = await prisma.resumeProgress.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ResumeProgressUpdateArgs>(args: SelectSubset<T, ResumeProgressUpdateArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ResumeProgresses.
     * @param {ResumeProgressDeleteManyArgs} args - Arguments to filter ResumeProgresses to delete.
     * @example
     * // Delete a few ResumeProgresses
     * const { count } = await prisma.resumeProgress.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ResumeProgressDeleteManyArgs>(args?: SelectSubset<T, ResumeProgressDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ResumeProgresses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ResumeProgresses
     * const resumeProgress = await prisma.resumeProgress.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ResumeProgressUpdateManyArgs>(args: SelectSubset<T, ResumeProgressUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ResumeProgress.
     * @param {ResumeProgressUpsertArgs} args - Arguments to update or create a ResumeProgress.
     * @example
     * // Update or create a ResumeProgress
     * const resumeProgress = await prisma.resumeProgress.upsert({
     *   create: {
     *     // ... data to create a ResumeProgress
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ResumeProgress we want to update
     *   }
     * })
     */
    upsert<T extends ResumeProgressUpsertArgs>(args: SelectSubset<T, ResumeProgressUpsertArgs<ExtArgs>>): Prisma__ResumeProgressClient<$Result.GetResult<Prisma.$ResumeProgressPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ResumeProgresses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressCountArgs} args - Arguments to filter ResumeProgresses to count.
     * @example
     * // Count the number of ResumeProgresses
     * const count = await prisma.resumeProgress.count({
     *   where: {
     *     // ... the filter for the ResumeProgresses we want to count
     *   }
     * })
    **/
    count<T extends ResumeProgressCountArgs>(
      args?: Subset<T, ResumeProgressCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ResumeProgressCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ResumeProgress.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ResumeProgressAggregateArgs>(args: Subset<T, ResumeProgressAggregateArgs>): Prisma.PrismaPromise<GetResumeProgressAggregateType<T>>

    /**
     * Group by ResumeProgress.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ResumeProgressGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ResumeProgressGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ResumeProgressGroupByArgs['orderBy'] }
        : { orderBy?: ResumeProgressGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ResumeProgressGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetResumeProgressGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ResumeProgress model
   */
  readonly fields: ResumeProgressFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ResumeProgress.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ResumeProgressClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ResumeProgress model
   */
  interface ResumeProgressFieldRefs {
    readonly id: FieldRef<"ResumeProgress", 'Int'>
    readonly profileId: FieldRef<"ResumeProgress", 'String'>
    readonly contentId: FieldRef<"ResumeProgress", 'String'>
    readonly progressMs: FieldRef<"ResumeProgress", 'Int'>
    readonly durationMs: FieldRef<"ResumeProgress", 'Int'>
    readonly lastUpdated: FieldRef<"ResumeProgress", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ResumeProgress findUnique
   */
  export type ResumeProgressFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * Filter, which ResumeProgress to fetch.
     */
    where: ResumeProgressWhereUniqueInput
  }

  /**
   * ResumeProgress findUniqueOrThrow
   */
  export type ResumeProgressFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * Filter, which ResumeProgress to fetch.
     */
    where: ResumeProgressWhereUniqueInput
  }

  /**
   * ResumeProgress findFirst
   */
  export type ResumeProgressFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * Filter, which ResumeProgress to fetch.
     */
    where?: ResumeProgressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ResumeProgresses to fetch.
     */
    orderBy?: ResumeProgressOrderByWithRelationInput | ResumeProgressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ResumeProgresses.
     */
    cursor?: ResumeProgressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ResumeProgresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ResumeProgresses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ResumeProgresses.
     */
    distinct?: ResumeProgressScalarFieldEnum | ResumeProgressScalarFieldEnum[]
  }

  /**
   * ResumeProgress findFirstOrThrow
   */
  export type ResumeProgressFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * Filter, which ResumeProgress to fetch.
     */
    where?: ResumeProgressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ResumeProgresses to fetch.
     */
    orderBy?: ResumeProgressOrderByWithRelationInput | ResumeProgressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ResumeProgresses.
     */
    cursor?: ResumeProgressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ResumeProgresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ResumeProgresses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ResumeProgresses.
     */
    distinct?: ResumeProgressScalarFieldEnum | ResumeProgressScalarFieldEnum[]
  }

  /**
   * ResumeProgress findMany
   */
  export type ResumeProgressFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * Filter, which ResumeProgresses to fetch.
     */
    where?: ResumeProgressWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ResumeProgresses to fetch.
     */
    orderBy?: ResumeProgressOrderByWithRelationInput | ResumeProgressOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ResumeProgresses.
     */
    cursor?: ResumeProgressWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ResumeProgresses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ResumeProgresses.
     */
    skip?: number
    distinct?: ResumeProgressScalarFieldEnum | ResumeProgressScalarFieldEnum[]
  }

  /**
   * ResumeProgress create
   */
  export type ResumeProgressCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * The data needed to create a ResumeProgress.
     */
    data: XOR<ResumeProgressCreateInput, ResumeProgressUncheckedCreateInput>
  }

  /**
   * ResumeProgress createMany
   */
  export type ResumeProgressCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ResumeProgresses.
     */
    data: ResumeProgressCreateManyInput | ResumeProgressCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ResumeProgress update
   */
  export type ResumeProgressUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * The data needed to update a ResumeProgress.
     */
    data: XOR<ResumeProgressUpdateInput, ResumeProgressUncheckedUpdateInput>
    /**
     * Choose, which ResumeProgress to update.
     */
    where: ResumeProgressWhereUniqueInput
  }

  /**
   * ResumeProgress updateMany
   */
  export type ResumeProgressUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ResumeProgresses.
     */
    data: XOR<ResumeProgressUpdateManyMutationInput, ResumeProgressUncheckedUpdateManyInput>
    /**
     * Filter which ResumeProgresses to update
     */
    where?: ResumeProgressWhereInput
    /**
     * Limit how many ResumeProgresses to update.
     */
    limit?: number
  }

  /**
   * ResumeProgress upsert
   */
  export type ResumeProgressUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * The filter to search for the ResumeProgress to update in case it exists.
     */
    where: ResumeProgressWhereUniqueInput
    /**
     * In case the ResumeProgress found by the `where` argument doesn't exist, create a new ResumeProgress with this data.
     */
    create: XOR<ResumeProgressCreateInput, ResumeProgressUncheckedCreateInput>
    /**
     * In case the ResumeProgress was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ResumeProgressUpdateInput, ResumeProgressUncheckedUpdateInput>
  }

  /**
   * ResumeProgress delete
   */
  export type ResumeProgressDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
    /**
     * Filter which ResumeProgress to delete.
     */
    where: ResumeProgressWhereUniqueInput
  }

  /**
   * ResumeProgress deleteMany
   */
  export type ResumeProgressDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ResumeProgresses to delete
     */
    where?: ResumeProgressWhereInput
    /**
     * Limit how many ResumeProgresses to delete.
     */
    limit?: number
  }

  /**
   * ResumeProgress without action
   */
  export type ResumeProgressDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ResumeProgress
     */
    select?: ResumeProgressSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ResumeProgress
     */
    omit?: ResumeProgressOmit<ExtArgs> | null
  }


  /**
   * Model ParentalConfig
   */

  export type AggregateParentalConfig = {
    _count: ParentalConfigCountAggregateOutputType | null
    _avg: ParentalConfigAvgAggregateOutputType | null
    _sum: ParentalConfigSumAggregateOutputType | null
    _min: ParentalConfigMinAggregateOutputType | null
    _max: ParentalConfigMaxAggregateOutputType | null
  }

  export type ParentalConfigAvgAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type ParentalConfigSumAggregateOutputType = {
    id: number | null
    userId: number | null
  }

  export type ParentalConfigMinAggregateOutputType = {
    id: number | null
    userId: number | null
    pin: string | null
    lockedCategories: string | null
    isPinEnabled: boolean | null
  }

  export type ParentalConfigMaxAggregateOutputType = {
    id: number | null
    userId: number | null
    pin: string | null
    lockedCategories: string | null
    isPinEnabled: boolean | null
  }

  export type ParentalConfigCountAggregateOutputType = {
    id: number
    userId: number
    pin: number
    lockedCategories: number
    isPinEnabled: number
    _all: number
  }


  export type ParentalConfigAvgAggregateInputType = {
    id?: true
    userId?: true
  }

  export type ParentalConfigSumAggregateInputType = {
    id?: true
    userId?: true
  }

  export type ParentalConfigMinAggregateInputType = {
    id?: true
    userId?: true
    pin?: true
    lockedCategories?: true
    isPinEnabled?: true
  }

  export type ParentalConfigMaxAggregateInputType = {
    id?: true
    userId?: true
    pin?: true
    lockedCategories?: true
    isPinEnabled?: true
  }

  export type ParentalConfigCountAggregateInputType = {
    id?: true
    userId?: true
    pin?: true
    lockedCategories?: true
    isPinEnabled?: true
    _all?: true
  }

  export type ParentalConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ParentalConfig to aggregate.
     */
    where?: ParentalConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParentalConfigs to fetch.
     */
    orderBy?: ParentalConfigOrderByWithRelationInput | ParentalConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ParentalConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParentalConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParentalConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ParentalConfigs
    **/
    _count?: true | ParentalConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ParentalConfigAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ParentalConfigSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ParentalConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ParentalConfigMaxAggregateInputType
  }

  export type GetParentalConfigAggregateType<T extends ParentalConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateParentalConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateParentalConfig[P]>
      : GetScalarType<T[P], AggregateParentalConfig[P]>
  }




  export type ParentalConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ParentalConfigWhereInput
    orderBy?: ParentalConfigOrderByWithAggregationInput | ParentalConfigOrderByWithAggregationInput[]
    by: ParentalConfigScalarFieldEnum[] | ParentalConfigScalarFieldEnum
    having?: ParentalConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ParentalConfigCountAggregateInputType | true
    _avg?: ParentalConfigAvgAggregateInputType
    _sum?: ParentalConfigSumAggregateInputType
    _min?: ParentalConfigMinAggregateInputType
    _max?: ParentalConfigMaxAggregateInputType
  }

  export type ParentalConfigGroupByOutputType = {
    id: number
    userId: number
    pin: string
    lockedCategories: string
    isPinEnabled: boolean
    _count: ParentalConfigCountAggregateOutputType | null
    _avg: ParentalConfigAvgAggregateOutputType | null
    _sum: ParentalConfigSumAggregateOutputType | null
    _min: ParentalConfigMinAggregateOutputType | null
    _max: ParentalConfigMaxAggregateOutputType | null
  }

  type GetParentalConfigGroupByPayload<T extends ParentalConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ParentalConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ParentalConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ParentalConfigGroupByOutputType[P]>
            : GetScalarType<T[P], ParentalConfigGroupByOutputType[P]>
        }
      >
    >


  export type ParentalConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    pin?: boolean
    lockedCategories?: boolean
    isPinEnabled?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["parentalConfig"]>



  export type ParentalConfigSelectScalar = {
    id?: boolean
    userId?: boolean
    pin?: boolean
    lockedCategories?: boolean
    isPinEnabled?: boolean
  }

  export type ParentalConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "pin" | "lockedCategories" | "isPinEnabled", ExtArgs["result"]["parentalConfig"]>
  export type ParentalConfigInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ParentalConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ParentalConfig"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: number
      userId: number
      pin: string
      lockedCategories: string
      isPinEnabled: boolean
    }, ExtArgs["result"]["parentalConfig"]>
    composites: {}
  }

  type ParentalConfigGetPayload<S extends boolean | null | undefined | ParentalConfigDefaultArgs> = $Result.GetResult<Prisma.$ParentalConfigPayload, S>

  type ParentalConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ParentalConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ParentalConfigCountAggregateInputType | true
    }

  export interface ParentalConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ParentalConfig'], meta: { name: 'ParentalConfig' } }
    /**
     * Find zero or one ParentalConfig that matches the filter.
     * @param {ParentalConfigFindUniqueArgs} args - Arguments to find a ParentalConfig
     * @example
     * // Get one ParentalConfig
     * const parentalConfig = await prisma.parentalConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ParentalConfigFindUniqueArgs>(args: SelectSubset<T, ParentalConfigFindUniqueArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ParentalConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ParentalConfigFindUniqueOrThrowArgs} args - Arguments to find a ParentalConfig
     * @example
     * // Get one ParentalConfig
     * const parentalConfig = await prisma.parentalConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ParentalConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, ParentalConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ParentalConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigFindFirstArgs} args - Arguments to find a ParentalConfig
     * @example
     * // Get one ParentalConfig
     * const parentalConfig = await prisma.parentalConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ParentalConfigFindFirstArgs>(args?: SelectSubset<T, ParentalConfigFindFirstArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ParentalConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigFindFirstOrThrowArgs} args - Arguments to find a ParentalConfig
     * @example
     * // Get one ParentalConfig
     * const parentalConfig = await prisma.parentalConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ParentalConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, ParentalConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ParentalConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ParentalConfigs
     * const parentalConfigs = await prisma.parentalConfig.findMany()
     * 
     * // Get first 10 ParentalConfigs
     * const parentalConfigs = await prisma.parentalConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const parentalConfigWithIdOnly = await prisma.parentalConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ParentalConfigFindManyArgs>(args?: SelectSubset<T, ParentalConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ParentalConfig.
     * @param {ParentalConfigCreateArgs} args - Arguments to create a ParentalConfig.
     * @example
     * // Create one ParentalConfig
     * const ParentalConfig = await prisma.parentalConfig.create({
     *   data: {
     *     // ... data to create a ParentalConfig
     *   }
     * })
     * 
     */
    create<T extends ParentalConfigCreateArgs>(args: SelectSubset<T, ParentalConfigCreateArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ParentalConfigs.
     * @param {ParentalConfigCreateManyArgs} args - Arguments to create many ParentalConfigs.
     * @example
     * // Create many ParentalConfigs
     * const parentalConfig = await prisma.parentalConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ParentalConfigCreateManyArgs>(args?: SelectSubset<T, ParentalConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ParentalConfig.
     * @param {ParentalConfigDeleteArgs} args - Arguments to delete one ParentalConfig.
     * @example
     * // Delete one ParentalConfig
     * const ParentalConfig = await prisma.parentalConfig.delete({
     *   where: {
     *     // ... filter to delete one ParentalConfig
     *   }
     * })
     * 
     */
    delete<T extends ParentalConfigDeleteArgs>(args: SelectSubset<T, ParentalConfigDeleteArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ParentalConfig.
     * @param {ParentalConfigUpdateArgs} args - Arguments to update one ParentalConfig.
     * @example
     * // Update one ParentalConfig
     * const parentalConfig = await prisma.parentalConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ParentalConfigUpdateArgs>(args: SelectSubset<T, ParentalConfigUpdateArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ParentalConfigs.
     * @param {ParentalConfigDeleteManyArgs} args - Arguments to filter ParentalConfigs to delete.
     * @example
     * // Delete a few ParentalConfigs
     * const { count } = await prisma.parentalConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ParentalConfigDeleteManyArgs>(args?: SelectSubset<T, ParentalConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ParentalConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ParentalConfigs
     * const parentalConfig = await prisma.parentalConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ParentalConfigUpdateManyArgs>(args: SelectSubset<T, ParentalConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ParentalConfig.
     * @param {ParentalConfigUpsertArgs} args - Arguments to update or create a ParentalConfig.
     * @example
     * // Update or create a ParentalConfig
     * const parentalConfig = await prisma.parentalConfig.upsert({
     *   create: {
     *     // ... data to create a ParentalConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ParentalConfig we want to update
     *   }
     * })
     */
    upsert<T extends ParentalConfigUpsertArgs>(args: SelectSubset<T, ParentalConfigUpsertArgs<ExtArgs>>): Prisma__ParentalConfigClient<$Result.GetResult<Prisma.$ParentalConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ParentalConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigCountArgs} args - Arguments to filter ParentalConfigs to count.
     * @example
     * // Count the number of ParentalConfigs
     * const count = await prisma.parentalConfig.count({
     *   where: {
     *     // ... the filter for the ParentalConfigs we want to count
     *   }
     * })
    **/
    count<T extends ParentalConfigCountArgs>(
      args?: Subset<T, ParentalConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ParentalConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ParentalConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ParentalConfigAggregateArgs>(args: Subset<T, ParentalConfigAggregateArgs>): Prisma.PrismaPromise<GetParentalConfigAggregateType<T>>

    /**
     * Group by ParentalConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ParentalConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ParentalConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ParentalConfigGroupByArgs['orderBy'] }
        : { orderBy?: ParentalConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ParentalConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetParentalConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ParentalConfig model
   */
  readonly fields: ParentalConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ParentalConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ParentalConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ParentalConfig model
   */
  interface ParentalConfigFieldRefs {
    readonly id: FieldRef<"ParentalConfig", 'Int'>
    readonly userId: FieldRef<"ParentalConfig", 'Int'>
    readonly pin: FieldRef<"ParentalConfig", 'String'>
    readonly lockedCategories: FieldRef<"ParentalConfig", 'String'>
    readonly isPinEnabled: FieldRef<"ParentalConfig", 'Boolean'>
  }
    

  // Custom InputTypes
  /**
   * ParentalConfig findUnique
   */
  export type ParentalConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * Filter, which ParentalConfig to fetch.
     */
    where: ParentalConfigWhereUniqueInput
  }

  /**
   * ParentalConfig findUniqueOrThrow
   */
  export type ParentalConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * Filter, which ParentalConfig to fetch.
     */
    where: ParentalConfigWhereUniqueInput
  }

  /**
   * ParentalConfig findFirst
   */
  export type ParentalConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * Filter, which ParentalConfig to fetch.
     */
    where?: ParentalConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParentalConfigs to fetch.
     */
    orderBy?: ParentalConfigOrderByWithRelationInput | ParentalConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ParentalConfigs.
     */
    cursor?: ParentalConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParentalConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParentalConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ParentalConfigs.
     */
    distinct?: ParentalConfigScalarFieldEnum | ParentalConfigScalarFieldEnum[]
  }

  /**
   * ParentalConfig findFirstOrThrow
   */
  export type ParentalConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * Filter, which ParentalConfig to fetch.
     */
    where?: ParentalConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParentalConfigs to fetch.
     */
    orderBy?: ParentalConfigOrderByWithRelationInput | ParentalConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ParentalConfigs.
     */
    cursor?: ParentalConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParentalConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParentalConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ParentalConfigs.
     */
    distinct?: ParentalConfigScalarFieldEnum | ParentalConfigScalarFieldEnum[]
  }

  /**
   * ParentalConfig findMany
   */
  export type ParentalConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * Filter, which ParentalConfigs to fetch.
     */
    where?: ParentalConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ParentalConfigs to fetch.
     */
    orderBy?: ParentalConfigOrderByWithRelationInput | ParentalConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ParentalConfigs.
     */
    cursor?: ParentalConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ParentalConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ParentalConfigs.
     */
    skip?: number
    distinct?: ParentalConfigScalarFieldEnum | ParentalConfigScalarFieldEnum[]
  }

  /**
   * ParentalConfig create
   */
  export type ParentalConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * The data needed to create a ParentalConfig.
     */
    data: XOR<ParentalConfigCreateInput, ParentalConfigUncheckedCreateInput>
  }

  /**
   * ParentalConfig createMany
   */
  export type ParentalConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ParentalConfigs.
     */
    data: ParentalConfigCreateManyInput | ParentalConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ParentalConfig update
   */
  export type ParentalConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * The data needed to update a ParentalConfig.
     */
    data: XOR<ParentalConfigUpdateInput, ParentalConfigUncheckedUpdateInput>
    /**
     * Choose, which ParentalConfig to update.
     */
    where: ParentalConfigWhereUniqueInput
  }

  /**
   * ParentalConfig updateMany
   */
  export type ParentalConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ParentalConfigs.
     */
    data: XOR<ParentalConfigUpdateManyMutationInput, ParentalConfigUncheckedUpdateManyInput>
    /**
     * Filter which ParentalConfigs to update
     */
    where?: ParentalConfigWhereInput
    /**
     * Limit how many ParentalConfigs to update.
     */
    limit?: number
  }

  /**
   * ParentalConfig upsert
   */
  export type ParentalConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * The filter to search for the ParentalConfig to update in case it exists.
     */
    where: ParentalConfigWhereUniqueInput
    /**
     * In case the ParentalConfig found by the `where` argument doesn't exist, create a new ParentalConfig with this data.
     */
    create: XOR<ParentalConfigCreateInput, ParentalConfigUncheckedCreateInput>
    /**
     * In case the ParentalConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ParentalConfigUpdateInput, ParentalConfigUncheckedUpdateInput>
  }

  /**
   * ParentalConfig delete
   */
  export type ParentalConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
    /**
     * Filter which ParentalConfig to delete.
     */
    where: ParentalConfigWhereUniqueInput
  }

  /**
   * ParentalConfig deleteMany
   */
  export type ParentalConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ParentalConfigs to delete
     */
    where?: ParentalConfigWhereInput
    /**
     * Limit how many ParentalConfigs to delete.
     */
    limit?: number
  }

  /**
   * ParentalConfig without action
   */
  export type ParentalConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ParentalConfig
     */
    select?: ParentalConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ParentalConfig
     */
    omit?: ParentalConfigOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ParentalConfigInclude<ExtArgs> | null
  }


  /**
   * Model ThemeConfig
   */

  export type AggregateThemeConfig = {
    _count: ThemeConfigCountAggregateOutputType | null
    _avg: ThemeConfigAvgAggregateOutputType | null
    _sum: ThemeConfigSumAggregateOutputType | null
    _min: ThemeConfigMinAggregateOutputType | null
    _max: ThemeConfigMaxAggregateOutputType | null
  }

  export type ThemeConfigAvgAggregateOutputType = {
    id: number | null
  }

  export type ThemeConfigSumAggregateOutputType = {
    id: number | null
  }

  export type ThemeConfigMinAggregateOutputType = {
    id: number | null
    primaryColor: string | null
    secondaryColor: string | null
    accentColor: string | null
    logoUrl: string | null
    backgroundUrl: string | null
    isLive: boolean | null
    updatedAt: Date | null
  }

  export type ThemeConfigMaxAggregateOutputType = {
    id: number | null
    primaryColor: string | null
    secondaryColor: string | null
    accentColor: string | null
    logoUrl: string | null
    backgroundUrl: string | null
    isLive: boolean | null
    updatedAt: Date | null
  }

  export type ThemeConfigCountAggregateOutputType = {
    id: number
    primaryColor: number
    secondaryColor: number
    accentColor: number
    logoUrl: number
    backgroundUrl: number
    isLive: number
    updatedAt: number
    _all: number
  }


  export type ThemeConfigAvgAggregateInputType = {
    id?: true
  }

  export type ThemeConfigSumAggregateInputType = {
    id?: true
  }

  export type ThemeConfigMinAggregateInputType = {
    id?: true
    primaryColor?: true
    secondaryColor?: true
    accentColor?: true
    logoUrl?: true
    backgroundUrl?: true
    isLive?: true
    updatedAt?: true
  }

  export type ThemeConfigMaxAggregateInputType = {
    id?: true
    primaryColor?: true
    secondaryColor?: true
    accentColor?: true
    logoUrl?: true
    backgroundUrl?: true
    isLive?: true
    updatedAt?: true
  }

  export type ThemeConfigCountAggregateInputType = {
    id?: true
    primaryColor?: true
    secondaryColor?: true
    accentColor?: true
    logoUrl?: true
    backgroundUrl?: true
    isLive?: true
    updatedAt?: true
    _all?: true
  }

  export type ThemeConfigAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ThemeConfig to aggregate.
     */
    where?: ThemeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ThemeConfigs to fetch.
     */
    orderBy?: ThemeConfigOrderByWithRelationInput | ThemeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ThemeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ThemeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ThemeConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned ThemeConfigs
    **/
    _count?: true | ThemeConfigCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ThemeConfigAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ThemeConfigSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ThemeConfigMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ThemeConfigMaxAggregateInputType
  }

  export type GetThemeConfigAggregateType<T extends ThemeConfigAggregateArgs> = {
        [P in keyof T & keyof AggregateThemeConfig]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateThemeConfig[P]>
      : GetScalarType<T[P], AggregateThemeConfig[P]>
  }




  export type ThemeConfigGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ThemeConfigWhereInput
    orderBy?: ThemeConfigOrderByWithAggregationInput | ThemeConfigOrderByWithAggregationInput[]
    by: ThemeConfigScalarFieldEnum[] | ThemeConfigScalarFieldEnum
    having?: ThemeConfigScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ThemeConfigCountAggregateInputType | true
    _avg?: ThemeConfigAvgAggregateInputType
    _sum?: ThemeConfigSumAggregateInputType
    _min?: ThemeConfigMinAggregateInputType
    _max?: ThemeConfigMaxAggregateInputType
  }

  export type ThemeConfigGroupByOutputType = {
    id: number
    primaryColor: string
    secondaryColor: string
    accentColor: string
    logoUrl: string | null
    backgroundUrl: string | null
    isLive: boolean
    updatedAt: Date
    _count: ThemeConfigCountAggregateOutputType | null
    _avg: ThemeConfigAvgAggregateOutputType | null
    _sum: ThemeConfigSumAggregateOutputType | null
    _min: ThemeConfigMinAggregateOutputType | null
    _max: ThemeConfigMaxAggregateOutputType | null
  }

  type GetThemeConfigGroupByPayload<T extends ThemeConfigGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ThemeConfigGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ThemeConfigGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ThemeConfigGroupByOutputType[P]>
            : GetScalarType<T[P], ThemeConfigGroupByOutputType[P]>
        }
      >
    >


  export type ThemeConfigSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    primaryColor?: boolean
    secondaryColor?: boolean
    accentColor?: boolean
    logoUrl?: boolean
    backgroundUrl?: boolean
    isLive?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["themeConfig"]>



  export type ThemeConfigSelectScalar = {
    id?: boolean
    primaryColor?: boolean
    secondaryColor?: boolean
    accentColor?: boolean
    logoUrl?: boolean
    backgroundUrl?: boolean
    isLive?: boolean
    updatedAt?: boolean
  }

  export type ThemeConfigOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "primaryColor" | "secondaryColor" | "accentColor" | "logoUrl" | "backgroundUrl" | "isLive" | "updatedAt", ExtArgs["result"]["themeConfig"]>

  export type $ThemeConfigPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "ThemeConfig"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      primaryColor: string
      secondaryColor: string
      accentColor: string
      logoUrl: string | null
      backgroundUrl: string | null
      isLive: boolean
      updatedAt: Date
    }, ExtArgs["result"]["themeConfig"]>
    composites: {}
  }

  type ThemeConfigGetPayload<S extends boolean | null | undefined | ThemeConfigDefaultArgs> = $Result.GetResult<Prisma.$ThemeConfigPayload, S>

  type ThemeConfigCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ThemeConfigFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ThemeConfigCountAggregateInputType | true
    }

  export interface ThemeConfigDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['ThemeConfig'], meta: { name: 'ThemeConfig' } }
    /**
     * Find zero or one ThemeConfig that matches the filter.
     * @param {ThemeConfigFindUniqueArgs} args - Arguments to find a ThemeConfig
     * @example
     * // Get one ThemeConfig
     * const themeConfig = await prisma.themeConfig.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ThemeConfigFindUniqueArgs>(args: SelectSubset<T, ThemeConfigFindUniqueArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one ThemeConfig that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ThemeConfigFindUniqueOrThrowArgs} args - Arguments to find a ThemeConfig
     * @example
     * // Get one ThemeConfig
     * const themeConfig = await prisma.themeConfig.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ThemeConfigFindUniqueOrThrowArgs>(args: SelectSubset<T, ThemeConfigFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ThemeConfig that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigFindFirstArgs} args - Arguments to find a ThemeConfig
     * @example
     * // Get one ThemeConfig
     * const themeConfig = await prisma.themeConfig.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ThemeConfigFindFirstArgs>(args?: SelectSubset<T, ThemeConfigFindFirstArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first ThemeConfig that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigFindFirstOrThrowArgs} args - Arguments to find a ThemeConfig
     * @example
     * // Get one ThemeConfig
     * const themeConfig = await prisma.themeConfig.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ThemeConfigFindFirstOrThrowArgs>(args?: SelectSubset<T, ThemeConfigFindFirstOrThrowArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more ThemeConfigs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all ThemeConfigs
     * const themeConfigs = await prisma.themeConfig.findMany()
     * 
     * // Get first 10 ThemeConfigs
     * const themeConfigs = await prisma.themeConfig.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const themeConfigWithIdOnly = await prisma.themeConfig.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ThemeConfigFindManyArgs>(args?: SelectSubset<T, ThemeConfigFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a ThemeConfig.
     * @param {ThemeConfigCreateArgs} args - Arguments to create a ThemeConfig.
     * @example
     * // Create one ThemeConfig
     * const ThemeConfig = await prisma.themeConfig.create({
     *   data: {
     *     // ... data to create a ThemeConfig
     *   }
     * })
     * 
     */
    create<T extends ThemeConfigCreateArgs>(args: SelectSubset<T, ThemeConfigCreateArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many ThemeConfigs.
     * @param {ThemeConfigCreateManyArgs} args - Arguments to create many ThemeConfigs.
     * @example
     * // Create many ThemeConfigs
     * const themeConfig = await prisma.themeConfig.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ThemeConfigCreateManyArgs>(args?: SelectSubset<T, ThemeConfigCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a ThemeConfig.
     * @param {ThemeConfigDeleteArgs} args - Arguments to delete one ThemeConfig.
     * @example
     * // Delete one ThemeConfig
     * const ThemeConfig = await prisma.themeConfig.delete({
     *   where: {
     *     // ... filter to delete one ThemeConfig
     *   }
     * })
     * 
     */
    delete<T extends ThemeConfigDeleteArgs>(args: SelectSubset<T, ThemeConfigDeleteArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one ThemeConfig.
     * @param {ThemeConfigUpdateArgs} args - Arguments to update one ThemeConfig.
     * @example
     * // Update one ThemeConfig
     * const themeConfig = await prisma.themeConfig.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ThemeConfigUpdateArgs>(args: SelectSubset<T, ThemeConfigUpdateArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more ThemeConfigs.
     * @param {ThemeConfigDeleteManyArgs} args - Arguments to filter ThemeConfigs to delete.
     * @example
     * // Delete a few ThemeConfigs
     * const { count } = await prisma.themeConfig.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ThemeConfigDeleteManyArgs>(args?: SelectSubset<T, ThemeConfigDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more ThemeConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many ThemeConfigs
     * const themeConfig = await prisma.themeConfig.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ThemeConfigUpdateManyArgs>(args: SelectSubset<T, ThemeConfigUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one ThemeConfig.
     * @param {ThemeConfigUpsertArgs} args - Arguments to update or create a ThemeConfig.
     * @example
     * // Update or create a ThemeConfig
     * const themeConfig = await prisma.themeConfig.upsert({
     *   create: {
     *     // ... data to create a ThemeConfig
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the ThemeConfig we want to update
     *   }
     * })
     */
    upsert<T extends ThemeConfigUpsertArgs>(args: SelectSubset<T, ThemeConfigUpsertArgs<ExtArgs>>): Prisma__ThemeConfigClient<$Result.GetResult<Prisma.$ThemeConfigPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of ThemeConfigs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigCountArgs} args - Arguments to filter ThemeConfigs to count.
     * @example
     * // Count the number of ThemeConfigs
     * const count = await prisma.themeConfig.count({
     *   where: {
     *     // ... the filter for the ThemeConfigs we want to count
     *   }
     * })
    **/
    count<T extends ThemeConfigCountArgs>(
      args?: Subset<T, ThemeConfigCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ThemeConfigCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a ThemeConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ThemeConfigAggregateArgs>(args: Subset<T, ThemeConfigAggregateArgs>): Prisma.PrismaPromise<GetThemeConfigAggregateType<T>>

    /**
     * Group by ThemeConfig.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ThemeConfigGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ThemeConfigGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ThemeConfigGroupByArgs['orderBy'] }
        : { orderBy?: ThemeConfigGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ThemeConfigGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetThemeConfigGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the ThemeConfig model
   */
  readonly fields: ThemeConfigFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for ThemeConfig.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ThemeConfigClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the ThemeConfig model
   */
  interface ThemeConfigFieldRefs {
    readonly id: FieldRef<"ThemeConfig", 'Int'>
    readonly primaryColor: FieldRef<"ThemeConfig", 'String'>
    readonly secondaryColor: FieldRef<"ThemeConfig", 'String'>
    readonly accentColor: FieldRef<"ThemeConfig", 'String'>
    readonly logoUrl: FieldRef<"ThemeConfig", 'String'>
    readonly backgroundUrl: FieldRef<"ThemeConfig", 'String'>
    readonly isLive: FieldRef<"ThemeConfig", 'Boolean'>
    readonly updatedAt: FieldRef<"ThemeConfig", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * ThemeConfig findUnique
   */
  export type ThemeConfigFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * Filter, which ThemeConfig to fetch.
     */
    where: ThemeConfigWhereUniqueInput
  }

  /**
   * ThemeConfig findUniqueOrThrow
   */
  export type ThemeConfigFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * Filter, which ThemeConfig to fetch.
     */
    where: ThemeConfigWhereUniqueInput
  }

  /**
   * ThemeConfig findFirst
   */
  export type ThemeConfigFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * Filter, which ThemeConfig to fetch.
     */
    where?: ThemeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ThemeConfigs to fetch.
     */
    orderBy?: ThemeConfigOrderByWithRelationInput | ThemeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ThemeConfigs.
     */
    cursor?: ThemeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ThemeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ThemeConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ThemeConfigs.
     */
    distinct?: ThemeConfigScalarFieldEnum | ThemeConfigScalarFieldEnum[]
  }

  /**
   * ThemeConfig findFirstOrThrow
   */
  export type ThemeConfigFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * Filter, which ThemeConfig to fetch.
     */
    where?: ThemeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ThemeConfigs to fetch.
     */
    orderBy?: ThemeConfigOrderByWithRelationInput | ThemeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for ThemeConfigs.
     */
    cursor?: ThemeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ThemeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ThemeConfigs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of ThemeConfigs.
     */
    distinct?: ThemeConfigScalarFieldEnum | ThemeConfigScalarFieldEnum[]
  }

  /**
   * ThemeConfig findMany
   */
  export type ThemeConfigFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * Filter, which ThemeConfigs to fetch.
     */
    where?: ThemeConfigWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of ThemeConfigs to fetch.
     */
    orderBy?: ThemeConfigOrderByWithRelationInput | ThemeConfigOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing ThemeConfigs.
     */
    cursor?: ThemeConfigWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` ThemeConfigs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` ThemeConfigs.
     */
    skip?: number
    distinct?: ThemeConfigScalarFieldEnum | ThemeConfigScalarFieldEnum[]
  }

  /**
   * ThemeConfig create
   */
  export type ThemeConfigCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * The data needed to create a ThemeConfig.
     */
    data: XOR<ThemeConfigCreateInput, ThemeConfigUncheckedCreateInput>
  }

  /**
   * ThemeConfig createMany
   */
  export type ThemeConfigCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many ThemeConfigs.
     */
    data: ThemeConfigCreateManyInput | ThemeConfigCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * ThemeConfig update
   */
  export type ThemeConfigUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * The data needed to update a ThemeConfig.
     */
    data: XOR<ThemeConfigUpdateInput, ThemeConfigUncheckedUpdateInput>
    /**
     * Choose, which ThemeConfig to update.
     */
    where: ThemeConfigWhereUniqueInput
  }

  /**
   * ThemeConfig updateMany
   */
  export type ThemeConfigUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update ThemeConfigs.
     */
    data: XOR<ThemeConfigUpdateManyMutationInput, ThemeConfigUncheckedUpdateManyInput>
    /**
     * Filter which ThemeConfigs to update
     */
    where?: ThemeConfigWhereInput
    /**
     * Limit how many ThemeConfigs to update.
     */
    limit?: number
  }

  /**
   * ThemeConfig upsert
   */
  export type ThemeConfigUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * The filter to search for the ThemeConfig to update in case it exists.
     */
    where: ThemeConfigWhereUniqueInput
    /**
     * In case the ThemeConfig found by the `where` argument doesn't exist, create a new ThemeConfig with this data.
     */
    create: XOR<ThemeConfigCreateInput, ThemeConfigUncheckedCreateInput>
    /**
     * In case the ThemeConfig was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ThemeConfigUpdateInput, ThemeConfigUncheckedUpdateInput>
  }

  /**
   * ThemeConfig delete
   */
  export type ThemeConfigDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
    /**
     * Filter which ThemeConfig to delete.
     */
    where: ThemeConfigWhereUniqueInput
  }

  /**
   * ThemeConfig deleteMany
   */
  export type ThemeConfigDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which ThemeConfigs to delete
     */
    where?: ThemeConfigWhereInput
    /**
     * Limit how many ThemeConfigs to delete.
     */
    limit?: number
  }

  /**
   * ThemeConfig without action
   */
  export type ThemeConfigDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the ThemeConfig
     */
    select?: ThemeConfigSelect<ExtArgs> | null
    /**
     * Omit specific fields from the ThemeConfig
     */
    omit?: ThemeConfigOmit<ExtArgs> | null
  }


  /**
   * Model Profile
   */

  export type AggregateProfile = {
    _count: ProfileCountAggregateOutputType | null
    _avg: ProfileAvgAggregateOutputType | null
    _sum: ProfileSumAggregateOutputType | null
    _min: ProfileMinAggregateOutputType | null
    _max: ProfileMaxAggregateOutputType | null
  }

  export type ProfileAvgAggregateOutputType = {
    userId: number | null
  }

  export type ProfileSumAggregateOutputType = {
    userId: number | null
  }

  export type ProfileMinAggregateOutputType = {
    id: string | null
    userId: number | null
    name: string | null
    avatarUrl: string | null
    isKids: boolean | null
    pin: string | null
    lastUsed: Date | null
  }

  export type ProfileMaxAggregateOutputType = {
    id: string | null
    userId: number | null
    name: string | null
    avatarUrl: string | null
    isKids: boolean | null
    pin: string | null
    lastUsed: Date | null
  }

  export type ProfileCountAggregateOutputType = {
    id: number
    userId: number
    name: number
    avatarUrl: number
    isKids: number
    pin: number
    lastUsed: number
    _all: number
  }


  export type ProfileAvgAggregateInputType = {
    userId?: true
  }

  export type ProfileSumAggregateInputType = {
    userId?: true
  }

  export type ProfileMinAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    avatarUrl?: true
    isKids?: true
    pin?: true
    lastUsed?: true
  }

  export type ProfileMaxAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    avatarUrl?: true
    isKids?: true
    pin?: true
    lastUsed?: true
  }

  export type ProfileCountAggregateInputType = {
    id?: true
    userId?: true
    name?: true
    avatarUrl?: true
    isKids?: true
    pin?: true
    lastUsed?: true
    _all?: true
  }

  export type ProfileAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Profile to aggregate.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Profiles
    **/
    _count?: true | ProfileCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: ProfileAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: ProfileSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: ProfileMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: ProfileMaxAggregateInputType
  }

  export type GetProfileAggregateType<T extends ProfileAggregateArgs> = {
        [P in keyof T & keyof AggregateProfile]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateProfile[P]>
      : GetScalarType<T[P], AggregateProfile[P]>
  }




  export type ProfileGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: ProfileWhereInput
    orderBy?: ProfileOrderByWithAggregationInput | ProfileOrderByWithAggregationInput[]
    by: ProfileScalarFieldEnum[] | ProfileScalarFieldEnum
    having?: ProfileScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: ProfileCountAggregateInputType | true
    _avg?: ProfileAvgAggregateInputType
    _sum?: ProfileSumAggregateInputType
    _min?: ProfileMinAggregateInputType
    _max?: ProfileMaxAggregateInputType
  }

  export type ProfileGroupByOutputType = {
    id: string
    userId: number
    name: string
    avatarUrl: string | null
    isKids: boolean
    pin: string | null
    lastUsed: Date
    _count: ProfileCountAggregateOutputType | null
    _avg: ProfileAvgAggregateOutputType | null
    _sum: ProfileSumAggregateOutputType | null
    _min: ProfileMinAggregateOutputType | null
    _max: ProfileMaxAggregateOutputType | null
  }

  type GetProfileGroupByPayload<T extends ProfileGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<ProfileGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof ProfileGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], ProfileGroupByOutputType[P]>
            : GetScalarType<T[P], ProfileGroupByOutputType[P]>
        }
      >
    >


  export type ProfileSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    userId?: boolean
    name?: boolean
    avatarUrl?: boolean
    isKids?: boolean
    pin?: boolean
    lastUsed?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["profile"]>



  export type ProfileSelectScalar = {
    id?: boolean
    userId?: boolean
    name?: boolean
    avatarUrl?: boolean
    isKids?: boolean
    pin?: boolean
    lastUsed?: boolean
  }

  export type ProfileOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "userId" | "name" | "avatarUrl" | "isKids" | "pin" | "lastUsed", ExtArgs["result"]["profile"]>
  export type ProfileInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $ProfilePayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Profile"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      userId: number
      name: string
      avatarUrl: string | null
      isKids: boolean
      pin: string | null
      lastUsed: Date
    }, ExtArgs["result"]["profile"]>
    composites: {}
  }

  type ProfileGetPayload<S extends boolean | null | undefined | ProfileDefaultArgs> = $Result.GetResult<Prisma.$ProfilePayload, S>

  type ProfileCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<ProfileFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: ProfileCountAggregateInputType | true
    }

  export interface ProfileDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Profile'], meta: { name: 'Profile' } }
    /**
     * Find zero or one Profile that matches the filter.
     * @param {ProfileFindUniqueArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends ProfileFindUniqueArgs>(args: SelectSubset<T, ProfileFindUniqueArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Profile that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {ProfileFindUniqueOrThrowArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends ProfileFindUniqueOrThrowArgs>(args: SelectSubset<T, ProfileFindUniqueOrThrowArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Profile that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileFindFirstArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends ProfileFindFirstArgs>(args?: SelectSubset<T, ProfileFindFirstArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Profile that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileFindFirstOrThrowArgs} args - Arguments to find a Profile
     * @example
     * // Get one Profile
     * const profile = await prisma.profile.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends ProfileFindFirstOrThrowArgs>(args?: SelectSubset<T, ProfileFindFirstOrThrowArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Profiles that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Profiles
     * const profiles = await prisma.profile.findMany()
     * 
     * // Get first 10 Profiles
     * const profiles = await prisma.profile.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const profileWithIdOnly = await prisma.profile.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends ProfileFindManyArgs>(args?: SelectSubset<T, ProfileFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Profile.
     * @param {ProfileCreateArgs} args - Arguments to create a Profile.
     * @example
     * // Create one Profile
     * const Profile = await prisma.profile.create({
     *   data: {
     *     // ... data to create a Profile
     *   }
     * })
     * 
     */
    create<T extends ProfileCreateArgs>(args: SelectSubset<T, ProfileCreateArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Profiles.
     * @param {ProfileCreateManyArgs} args - Arguments to create many Profiles.
     * @example
     * // Create many Profiles
     * const profile = await prisma.profile.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends ProfileCreateManyArgs>(args?: SelectSubset<T, ProfileCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a Profile.
     * @param {ProfileDeleteArgs} args - Arguments to delete one Profile.
     * @example
     * // Delete one Profile
     * const Profile = await prisma.profile.delete({
     *   where: {
     *     // ... filter to delete one Profile
     *   }
     * })
     * 
     */
    delete<T extends ProfileDeleteArgs>(args: SelectSubset<T, ProfileDeleteArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Profile.
     * @param {ProfileUpdateArgs} args - Arguments to update one Profile.
     * @example
     * // Update one Profile
     * const profile = await prisma.profile.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends ProfileUpdateArgs>(args: SelectSubset<T, ProfileUpdateArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Profiles.
     * @param {ProfileDeleteManyArgs} args - Arguments to filter Profiles to delete.
     * @example
     * // Delete a few Profiles
     * const { count } = await prisma.profile.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends ProfileDeleteManyArgs>(args?: SelectSubset<T, ProfileDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Profiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Profiles
     * const profile = await prisma.profile.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends ProfileUpdateManyArgs>(args: SelectSubset<T, ProfileUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one Profile.
     * @param {ProfileUpsertArgs} args - Arguments to update or create a Profile.
     * @example
     * // Update or create a Profile
     * const profile = await prisma.profile.upsert({
     *   create: {
     *     // ... data to create a Profile
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Profile we want to update
     *   }
     * })
     */
    upsert<T extends ProfileUpsertArgs>(args: SelectSubset<T, ProfileUpsertArgs<ExtArgs>>): Prisma__ProfileClient<$Result.GetResult<Prisma.$ProfilePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Profiles.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileCountArgs} args - Arguments to filter Profiles to count.
     * @example
     * // Count the number of Profiles
     * const count = await prisma.profile.count({
     *   where: {
     *     // ... the filter for the Profiles we want to count
     *   }
     * })
    **/
    count<T extends ProfileCountArgs>(
      args?: Subset<T, ProfileCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], ProfileCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Profile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends ProfileAggregateArgs>(args: Subset<T, ProfileAggregateArgs>): Prisma.PrismaPromise<GetProfileAggregateType<T>>

    /**
     * Group by Profile.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {ProfileGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends ProfileGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: ProfileGroupByArgs['orderBy'] }
        : { orderBy?: ProfileGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, ProfileGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetProfileGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Profile model
   */
  readonly fields: ProfileFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Profile.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__ProfileClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Profile model
   */
  interface ProfileFieldRefs {
    readonly id: FieldRef<"Profile", 'String'>
    readonly userId: FieldRef<"Profile", 'Int'>
    readonly name: FieldRef<"Profile", 'String'>
    readonly avatarUrl: FieldRef<"Profile", 'String'>
    readonly isKids: FieldRef<"Profile", 'Boolean'>
    readonly pin: FieldRef<"Profile", 'String'>
    readonly lastUsed: FieldRef<"Profile", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Profile findUnique
   */
  export type ProfileFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile findUniqueOrThrow
   */
  export type ProfileFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile findFirst
   */
  export type ProfileFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Profiles.
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Profiles.
     */
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * Profile findFirstOrThrow
   */
  export type ProfileFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * Filter, which Profile to fetch.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Profiles.
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Profiles.
     */
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * Profile findMany
   */
  export type ProfileFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * Filter, which Profiles to fetch.
     */
    where?: ProfileWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Profiles to fetch.
     */
    orderBy?: ProfileOrderByWithRelationInput | ProfileOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Profiles.
     */
    cursor?: ProfileWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Profiles from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Profiles.
     */
    skip?: number
    distinct?: ProfileScalarFieldEnum | ProfileScalarFieldEnum[]
  }

  /**
   * Profile create
   */
  export type ProfileCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * The data needed to create a Profile.
     */
    data: XOR<ProfileCreateInput, ProfileUncheckedCreateInput>
  }

  /**
   * Profile createMany
   */
  export type ProfileCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Profiles.
     */
    data: ProfileCreateManyInput | ProfileCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Profile update
   */
  export type ProfileUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * The data needed to update a Profile.
     */
    data: XOR<ProfileUpdateInput, ProfileUncheckedUpdateInput>
    /**
     * Choose, which Profile to update.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile updateMany
   */
  export type ProfileUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Profiles.
     */
    data: XOR<ProfileUpdateManyMutationInput, ProfileUncheckedUpdateManyInput>
    /**
     * Filter which Profiles to update
     */
    where?: ProfileWhereInput
    /**
     * Limit how many Profiles to update.
     */
    limit?: number
  }

  /**
   * Profile upsert
   */
  export type ProfileUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * The filter to search for the Profile to update in case it exists.
     */
    where: ProfileWhereUniqueInput
    /**
     * In case the Profile found by the `where` argument doesn't exist, create a new Profile with this data.
     */
    create: XOR<ProfileCreateInput, ProfileUncheckedCreateInput>
    /**
     * In case the Profile was found with the provided `where` argument, update it with this data.
     */
    update: XOR<ProfileUpdateInput, ProfileUncheckedUpdateInput>
  }

  /**
   * Profile delete
   */
  export type ProfileDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
    /**
     * Filter which Profile to delete.
     */
    where: ProfileWhereUniqueInput
  }

  /**
   * Profile deleteMany
   */
  export type ProfileDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Profiles to delete
     */
    where?: ProfileWhereInput
    /**
     * Limit how many Profiles to delete.
     */
    limit?: number
  }

  /**
   * Profile without action
   */
  export type ProfileDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Profile
     */
    select?: ProfileSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Profile
     */
    omit?: ProfileOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: ProfileInclude<ExtArgs> | null
  }


  /**
   * Model TmdbMetadata
   */

  export type AggregateTmdbMetadata = {
    _count: TmdbMetadataCountAggregateOutputType | null
    _avg: TmdbMetadataAvgAggregateOutputType | null
    _sum: TmdbMetadataSumAggregateOutputType | null
    _min: TmdbMetadataMinAggregateOutputType | null
    _max: TmdbMetadataMaxAggregateOutputType | null
  }

  export type TmdbMetadataAvgAggregateOutputType = {
    id: number | null
    tmdbId: number | null
    rating: number | null
  }

  export type TmdbMetadataSumAggregateOutputType = {
    id: number | null
    tmdbId: number | null
    rating: number | null
  }

  export type TmdbMetadataMinAggregateOutputType = {
    id: number | null
    contentId: string | null
    tmdbId: number | null
    title: string | null
    overview: string | null
    posterPath: string | null
    backdropPath: string | null
    rating: number | null
    ageRating: string | null
    releaseDate: string | null
    genres: string | null
    cast: string | null
    updatedAt: Date | null
  }

  export type TmdbMetadataMaxAggregateOutputType = {
    id: number | null
    contentId: string | null
    tmdbId: number | null
    title: string | null
    overview: string | null
    posterPath: string | null
    backdropPath: string | null
    rating: number | null
    ageRating: string | null
    releaseDate: string | null
    genres: string | null
    cast: string | null
    updatedAt: Date | null
  }

  export type TmdbMetadataCountAggregateOutputType = {
    id: number
    contentId: number
    tmdbId: number
    title: number
    overview: number
    posterPath: number
    backdropPath: number
    rating: number
    ageRating: number
    releaseDate: number
    genres: number
    cast: number
    updatedAt: number
    _all: number
  }


  export type TmdbMetadataAvgAggregateInputType = {
    id?: true
    tmdbId?: true
    rating?: true
  }

  export type TmdbMetadataSumAggregateInputType = {
    id?: true
    tmdbId?: true
    rating?: true
  }

  export type TmdbMetadataMinAggregateInputType = {
    id?: true
    contentId?: true
    tmdbId?: true
    title?: true
    overview?: true
    posterPath?: true
    backdropPath?: true
    rating?: true
    ageRating?: true
    releaseDate?: true
    genres?: true
    cast?: true
    updatedAt?: true
  }

  export type TmdbMetadataMaxAggregateInputType = {
    id?: true
    contentId?: true
    tmdbId?: true
    title?: true
    overview?: true
    posterPath?: true
    backdropPath?: true
    rating?: true
    ageRating?: true
    releaseDate?: true
    genres?: true
    cast?: true
    updatedAt?: true
  }

  export type TmdbMetadataCountAggregateInputType = {
    id?: true
    contentId?: true
    tmdbId?: true
    title?: true
    overview?: true
    posterPath?: true
    backdropPath?: true
    rating?: true
    ageRating?: true
    releaseDate?: true
    genres?: true
    cast?: true
    updatedAt?: true
    _all?: true
  }

  export type TmdbMetadataAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TmdbMetadata to aggregate.
     */
    where?: TmdbMetadataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TmdbMetadata to fetch.
     */
    orderBy?: TmdbMetadataOrderByWithRelationInput | TmdbMetadataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: TmdbMetadataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TmdbMetadata from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TmdbMetadata.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned TmdbMetadata
    **/
    _count?: true | TmdbMetadataCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: TmdbMetadataAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: TmdbMetadataSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: TmdbMetadataMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: TmdbMetadataMaxAggregateInputType
  }

  export type GetTmdbMetadataAggregateType<T extends TmdbMetadataAggregateArgs> = {
        [P in keyof T & keyof AggregateTmdbMetadata]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateTmdbMetadata[P]>
      : GetScalarType<T[P], AggregateTmdbMetadata[P]>
  }




  export type TmdbMetadataGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: TmdbMetadataWhereInput
    orderBy?: TmdbMetadataOrderByWithAggregationInput | TmdbMetadataOrderByWithAggregationInput[]
    by: TmdbMetadataScalarFieldEnum[] | TmdbMetadataScalarFieldEnum
    having?: TmdbMetadataScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: TmdbMetadataCountAggregateInputType | true
    _avg?: TmdbMetadataAvgAggregateInputType
    _sum?: TmdbMetadataSumAggregateInputType
    _min?: TmdbMetadataMinAggregateInputType
    _max?: TmdbMetadataMaxAggregateInputType
  }

  export type TmdbMetadataGroupByOutputType = {
    id: number
    contentId: string
    tmdbId: number | null
    title: string
    overview: string | null
    posterPath: string | null
    backdropPath: string | null
    rating: number | null
    ageRating: string | null
    releaseDate: string | null
    genres: string | null
    cast: string | null
    updatedAt: Date
    _count: TmdbMetadataCountAggregateOutputType | null
    _avg: TmdbMetadataAvgAggregateOutputType | null
    _sum: TmdbMetadataSumAggregateOutputType | null
    _min: TmdbMetadataMinAggregateOutputType | null
    _max: TmdbMetadataMaxAggregateOutputType | null
  }

  type GetTmdbMetadataGroupByPayload<T extends TmdbMetadataGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<TmdbMetadataGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof TmdbMetadataGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], TmdbMetadataGroupByOutputType[P]>
            : GetScalarType<T[P], TmdbMetadataGroupByOutputType[P]>
        }
      >
    >


  export type TmdbMetadataSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    contentId?: boolean
    tmdbId?: boolean
    title?: boolean
    overview?: boolean
    posterPath?: boolean
    backdropPath?: boolean
    rating?: boolean
    ageRating?: boolean
    releaseDate?: boolean
    genres?: boolean
    cast?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["tmdbMetadata"]>



  export type TmdbMetadataSelectScalar = {
    id?: boolean
    contentId?: boolean
    tmdbId?: boolean
    title?: boolean
    overview?: boolean
    posterPath?: boolean
    backdropPath?: boolean
    rating?: boolean
    ageRating?: boolean
    releaseDate?: boolean
    genres?: boolean
    cast?: boolean
    updatedAt?: boolean
  }

  export type TmdbMetadataOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "contentId" | "tmdbId" | "title" | "overview" | "posterPath" | "backdropPath" | "rating" | "ageRating" | "releaseDate" | "genres" | "cast" | "updatedAt", ExtArgs["result"]["tmdbMetadata"]>

  export type $TmdbMetadataPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "TmdbMetadata"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      contentId: string
      tmdbId: number | null
      title: string
      overview: string | null
      posterPath: string | null
      backdropPath: string | null
      rating: number | null
      ageRating: string | null
      releaseDate: string | null
      genres: string | null
      cast: string | null
      updatedAt: Date
    }, ExtArgs["result"]["tmdbMetadata"]>
    composites: {}
  }

  type TmdbMetadataGetPayload<S extends boolean | null | undefined | TmdbMetadataDefaultArgs> = $Result.GetResult<Prisma.$TmdbMetadataPayload, S>

  type TmdbMetadataCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<TmdbMetadataFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: TmdbMetadataCountAggregateInputType | true
    }

  export interface TmdbMetadataDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['TmdbMetadata'], meta: { name: 'TmdbMetadata' } }
    /**
     * Find zero or one TmdbMetadata that matches the filter.
     * @param {TmdbMetadataFindUniqueArgs} args - Arguments to find a TmdbMetadata
     * @example
     * // Get one TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends TmdbMetadataFindUniqueArgs>(args: SelectSubset<T, TmdbMetadataFindUniqueArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one TmdbMetadata that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {TmdbMetadataFindUniqueOrThrowArgs} args - Arguments to find a TmdbMetadata
     * @example
     * // Get one TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends TmdbMetadataFindUniqueOrThrowArgs>(args: SelectSubset<T, TmdbMetadataFindUniqueOrThrowArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TmdbMetadata that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataFindFirstArgs} args - Arguments to find a TmdbMetadata
     * @example
     * // Get one TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends TmdbMetadataFindFirstArgs>(args?: SelectSubset<T, TmdbMetadataFindFirstArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first TmdbMetadata that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataFindFirstOrThrowArgs} args - Arguments to find a TmdbMetadata
     * @example
     * // Get one TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends TmdbMetadataFindFirstOrThrowArgs>(args?: SelectSubset<T, TmdbMetadataFindFirstOrThrowArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more TmdbMetadata that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.findMany()
     * 
     * // Get first 10 TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const tmdbMetadataWithIdOnly = await prisma.tmdbMetadata.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends TmdbMetadataFindManyArgs>(args?: SelectSubset<T, TmdbMetadataFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a TmdbMetadata.
     * @param {TmdbMetadataCreateArgs} args - Arguments to create a TmdbMetadata.
     * @example
     * // Create one TmdbMetadata
     * const TmdbMetadata = await prisma.tmdbMetadata.create({
     *   data: {
     *     // ... data to create a TmdbMetadata
     *   }
     * })
     * 
     */
    create<T extends TmdbMetadataCreateArgs>(args: SelectSubset<T, TmdbMetadataCreateArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many TmdbMetadata.
     * @param {TmdbMetadataCreateManyArgs} args - Arguments to create many TmdbMetadata.
     * @example
     * // Create many TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends TmdbMetadataCreateManyArgs>(args?: SelectSubset<T, TmdbMetadataCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a TmdbMetadata.
     * @param {TmdbMetadataDeleteArgs} args - Arguments to delete one TmdbMetadata.
     * @example
     * // Delete one TmdbMetadata
     * const TmdbMetadata = await prisma.tmdbMetadata.delete({
     *   where: {
     *     // ... filter to delete one TmdbMetadata
     *   }
     * })
     * 
     */
    delete<T extends TmdbMetadataDeleteArgs>(args: SelectSubset<T, TmdbMetadataDeleteArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one TmdbMetadata.
     * @param {TmdbMetadataUpdateArgs} args - Arguments to update one TmdbMetadata.
     * @example
     * // Update one TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends TmdbMetadataUpdateArgs>(args: SelectSubset<T, TmdbMetadataUpdateArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more TmdbMetadata.
     * @param {TmdbMetadataDeleteManyArgs} args - Arguments to filter TmdbMetadata to delete.
     * @example
     * // Delete a few TmdbMetadata
     * const { count } = await prisma.tmdbMetadata.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends TmdbMetadataDeleteManyArgs>(args?: SelectSubset<T, TmdbMetadataDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more TmdbMetadata.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends TmdbMetadataUpdateManyArgs>(args: SelectSubset<T, TmdbMetadataUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one TmdbMetadata.
     * @param {TmdbMetadataUpsertArgs} args - Arguments to update or create a TmdbMetadata.
     * @example
     * // Update or create a TmdbMetadata
     * const tmdbMetadata = await prisma.tmdbMetadata.upsert({
     *   create: {
     *     // ... data to create a TmdbMetadata
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the TmdbMetadata we want to update
     *   }
     * })
     */
    upsert<T extends TmdbMetadataUpsertArgs>(args: SelectSubset<T, TmdbMetadataUpsertArgs<ExtArgs>>): Prisma__TmdbMetadataClient<$Result.GetResult<Prisma.$TmdbMetadataPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of TmdbMetadata.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataCountArgs} args - Arguments to filter TmdbMetadata to count.
     * @example
     * // Count the number of TmdbMetadata
     * const count = await prisma.tmdbMetadata.count({
     *   where: {
     *     // ... the filter for the TmdbMetadata we want to count
     *   }
     * })
    **/
    count<T extends TmdbMetadataCountArgs>(
      args?: Subset<T, TmdbMetadataCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], TmdbMetadataCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a TmdbMetadata.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends TmdbMetadataAggregateArgs>(args: Subset<T, TmdbMetadataAggregateArgs>): Prisma.PrismaPromise<GetTmdbMetadataAggregateType<T>>

    /**
     * Group by TmdbMetadata.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {TmdbMetadataGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends TmdbMetadataGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: TmdbMetadataGroupByArgs['orderBy'] }
        : { orderBy?: TmdbMetadataGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, TmdbMetadataGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTmdbMetadataGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the TmdbMetadata model
   */
  readonly fields: TmdbMetadataFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for TmdbMetadata.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__TmdbMetadataClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the TmdbMetadata model
   */
  interface TmdbMetadataFieldRefs {
    readonly id: FieldRef<"TmdbMetadata", 'Int'>
    readonly contentId: FieldRef<"TmdbMetadata", 'String'>
    readonly tmdbId: FieldRef<"TmdbMetadata", 'Int'>
    readonly title: FieldRef<"TmdbMetadata", 'String'>
    readonly overview: FieldRef<"TmdbMetadata", 'String'>
    readonly posterPath: FieldRef<"TmdbMetadata", 'String'>
    readonly backdropPath: FieldRef<"TmdbMetadata", 'String'>
    readonly rating: FieldRef<"TmdbMetadata", 'Float'>
    readonly ageRating: FieldRef<"TmdbMetadata", 'String'>
    readonly releaseDate: FieldRef<"TmdbMetadata", 'String'>
    readonly genres: FieldRef<"TmdbMetadata", 'String'>
    readonly cast: FieldRef<"TmdbMetadata", 'String'>
    readonly updatedAt: FieldRef<"TmdbMetadata", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * TmdbMetadata findUnique
   */
  export type TmdbMetadataFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * Filter, which TmdbMetadata to fetch.
     */
    where: TmdbMetadataWhereUniqueInput
  }

  /**
   * TmdbMetadata findUniqueOrThrow
   */
  export type TmdbMetadataFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * Filter, which TmdbMetadata to fetch.
     */
    where: TmdbMetadataWhereUniqueInput
  }

  /**
   * TmdbMetadata findFirst
   */
  export type TmdbMetadataFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * Filter, which TmdbMetadata to fetch.
     */
    where?: TmdbMetadataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TmdbMetadata to fetch.
     */
    orderBy?: TmdbMetadataOrderByWithRelationInput | TmdbMetadataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TmdbMetadata.
     */
    cursor?: TmdbMetadataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TmdbMetadata from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TmdbMetadata.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TmdbMetadata.
     */
    distinct?: TmdbMetadataScalarFieldEnum | TmdbMetadataScalarFieldEnum[]
  }

  /**
   * TmdbMetadata findFirstOrThrow
   */
  export type TmdbMetadataFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * Filter, which TmdbMetadata to fetch.
     */
    where?: TmdbMetadataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TmdbMetadata to fetch.
     */
    orderBy?: TmdbMetadataOrderByWithRelationInput | TmdbMetadataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for TmdbMetadata.
     */
    cursor?: TmdbMetadataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TmdbMetadata from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TmdbMetadata.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of TmdbMetadata.
     */
    distinct?: TmdbMetadataScalarFieldEnum | TmdbMetadataScalarFieldEnum[]
  }

  /**
   * TmdbMetadata findMany
   */
  export type TmdbMetadataFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * Filter, which TmdbMetadata to fetch.
     */
    where?: TmdbMetadataWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of TmdbMetadata to fetch.
     */
    orderBy?: TmdbMetadataOrderByWithRelationInput | TmdbMetadataOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing TmdbMetadata.
     */
    cursor?: TmdbMetadataWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` TmdbMetadata from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` TmdbMetadata.
     */
    skip?: number
    distinct?: TmdbMetadataScalarFieldEnum | TmdbMetadataScalarFieldEnum[]
  }

  /**
   * TmdbMetadata create
   */
  export type TmdbMetadataCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * The data needed to create a TmdbMetadata.
     */
    data: XOR<TmdbMetadataCreateInput, TmdbMetadataUncheckedCreateInput>
  }

  /**
   * TmdbMetadata createMany
   */
  export type TmdbMetadataCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many TmdbMetadata.
     */
    data: TmdbMetadataCreateManyInput | TmdbMetadataCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * TmdbMetadata update
   */
  export type TmdbMetadataUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * The data needed to update a TmdbMetadata.
     */
    data: XOR<TmdbMetadataUpdateInput, TmdbMetadataUncheckedUpdateInput>
    /**
     * Choose, which TmdbMetadata to update.
     */
    where: TmdbMetadataWhereUniqueInput
  }

  /**
   * TmdbMetadata updateMany
   */
  export type TmdbMetadataUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update TmdbMetadata.
     */
    data: XOR<TmdbMetadataUpdateManyMutationInput, TmdbMetadataUncheckedUpdateManyInput>
    /**
     * Filter which TmdbMetadata to update
     */
    where?: TmdbMetadataWhereInput
    /**
     * Limit how many TmdbMetadata to update.
     */
    limit?: number
  }

  /**
   * TmdbMetadata upsert
   */
  export type TmdbMetadataUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * The filter to search for the TmdbMetadata to update in case it exists.
     */
    where: TmdbMetadataWhereUniqueInput
    /**
     * In case the TmdbMetadata found by the `where` argument doesn't exist, create a new TmdbMetadata with this data.
     */
    create: XOR<TmdbMetadataCreateInput, TmdbMetadataUncheckedCreateInput>
    /**
     * In case the TmdbMetadata was found with the provided `where` argument, update it with this data.
     */
    update: XOR<TmdbMetadataUpdateInput, TmdbMetadataUncheckedUpdateInput>
  }

  /**
   * TmdbMetadata delete
   */
  export type TmdbMetadataDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
    /**
     * Filter which TmdbMetadata to delete.
     */
    where: TmdbMetadataWhereUniqueInput
  }

  /**
   * TmdbMetadata deleteMany
   */
  export type TmdbMetadataDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which TmdbMetadata to delete
     */
    where?: TmdbMetadataWhereInput
    /**
     * Limit how many TmdbMetadata to delete.
     */
    limit?: number
  }

  /**
   * TmdbMetadata without action
   */
  export type TmdbMetadataDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the TmdbMetadata
     */
    select?: TmdbMetadataSelect<ExtArgs> | null
    /**
     * Omit specific fields from the TmdbMetadata
     */
    omit?: TmdbMetadataOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    name: 'name',
    email: 'email',
    password: 'password',
    role: 'role',
    isActive: 'isActive',
    authProvider: 'authProvider',
    lastLoginAt: 'lastLoginAt',
    lastLoginIp: 'lastLoginIp',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const DeviceUserScalarFieldEnum: {
    id: 'id',
    deviceId: 'deviceId',
    softwareId: 'softwareId',
    mac: 'mac',
    brand: 'brand',
    model: 'model',
    serial: 'serial',
    platform: 'platform',
    publicIp: 'publicIp',
    appVersion: 'appVersion',
    osVersion: 'osVersion',
    lastSeenAt: 'lastSeenAt',
    userId: 'userId',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type DeviceUserScalarFieldEnum = (typeof DeviceUserScalarFieldEnum)[keyof typeof DeviceUserScalarFieldEnum]


  export const XtreamServerScalarFieldEnum: {
    id: 'id',
    name: 'name',
    url: 'url',
    serverIdentity: 'serverIdentity',
    isActive: 'isActive',
    isDefault: 'isDefault',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type XtreamServerScalarFieldEnum = (typeof XtreamServerScalarFieldEnum)[keyof typeof XtreamServerScalarFieldEnum]


  export const LicenseScalarFieldEnum: {
    id: 'id',
    key: 'key',
    userId: 'userId',
    deviceUserId: 'deviceUserId',
    serverId: 'serverId',
    xtreamUser: 'xtreamUser',
    xtreamPass: 'xtreamPass',
    plan: 'plan',
    status: 'status',
    expiresAt: 'expiresAt',
    activatedAt: 'activatedAt',
    lastUsedAt: 'lastUsedAt',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    deletedAt: 'deletedAt'
  };

  export type LicenseScalarFieldEnum = (typeof LicenseScalarFieldEnum)[keyof typeof LicenseScalarFieldEnum]


  export const AuditLogScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    action: 'action',
    entity: 'entity',
    entityId: 'entityId',
    details: 'details',
    ipAddress: 'ipAddress',
    createdAt: 'createdAt'
  };

  export type AuditLogScalarFieldEnum = (typeof AuditLogScalarFieldEnum)[keyof typeof AuditLogScalarFieldEnum]


  export const SessionScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    refreshToken: 'refreshToken',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
  };

  export type SessionScalarFieldEnum = (typeof SessionScalarFieldEnum)[keyof typeof SessionScalarFieldEnum]


  export const DeviceTokenScalarFieldEnum: {
    id: 'id',
    token: 'token',
    settingsCode: 'settingsCode',
    deviceId: 'deviceId',
    mac: 'mac',
    isUsed: 'isUsed',
    expiresAt: 'expiresAt',
    createdAt: 'createdAt'
  };

  export type DeviceTokenScalarFieldEnum = (typeof DeviceTokenScalarFieldEnum)[keyof typeof DeviceTokenScalarFieldEnum]


  export const DeviceBlacklistScalarFieldEnum: {
    id: 'id',
    deviceId: 'deviceId',
    mac: 'mac',
    reason: 'reason',
    details: 'details',
    createdAt: 'createdAt'
  };

  export type DeviceBlacklistScalarFieldEnum = (typeof DeviceBlacklistScalarFieldEnum)[keyof typeof DeviceBlacklistScalarFieldEnum]


  export const PlaybackActivityScalarFieldEnum: {
    id: 'id',
    movieId: 'movieId',
    type: 'type',
    profileId: 'profileId',
    status: 'status',
    timestamp: 'timestamp'
  };

  export type PlaybackActivityScalarFieldEnum = (typeof PlaybackActivityScalarFieldEnum)[keyof typeof PlaybackActivityScalarFieldEnum]


  export const ResumeProgressScalarFieldEnum: {
    id: 'id',
    profileId: 'profileId',
    contentId: 'contentId',
    progressMs: 'progressMs',
    durationMs: 'durationMs',
    lastUpdated: 'lastUpdated'
  };

  export type ResumeProgressScalarFieldEnum = (typeof ResumeProgressScalarFieldEnum)[keyof typeof ResumeProgressScalarFieldEnum]


  export const ParentalConfigScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    pin: 'pin',
    lockedCategories: 'lockedCategories',
    isPinEnabled: 'isPinEnabled'
  };

  export type ParentalConfigScalarFieldEnum = (typeof ParentalConfigScalarFieldEnum)[keyof typeof ParentalConfigScalarFieldEnum]


  export const ThemeConfigScalarFieldEnum: {
    id: 'id',
    primaryColor: 'primaryColor',
    secondaryColor: 'secondaryColor',
    accentColor: 'accentColor',
    logoUrl: 'logoUrl',
    backgroundUrl: 'backgroundUrl',
    isLive: 'isLive',
    updatedAt: 'updatedAt'
  };

  export type ThemeConfigScalarFieldEnum = (typeof ThemeConfigScalarFieldEnum)[keyof typeof ThemeConfigScalarFieldEnum]


  export const ProfileScalarFieldEnum: {
    id: 'id',
    userId: 'userId',
    name: 'name',
    avatarUrl: 'avatarUrl',
    isKids: 'isKids',
    pin: 'pin',
    lastUsed: 'lastUsed'
  };

  export type ProfileScalarFieldEnum = (typeof ProfileScalarFieldEnum)[keyof typeof ProfileScalarFieldEnum]


  export const TmdbMetadataScalarFieldEnum: {
    id: 'id',
    contentId: 'contentId',
    tmdbId: 'tmdbId',
    title: 'title',
    overview: 'overview',
    posterPath: 'posterPath',
    backdropPath: 'backdropPath',
    rating: 'rating',
    ageRating: 'ageRating',
    releaseDate: 'releaseDate',
    genres: 'genres',
    cast: 'cast',
    updatedAt: 'updatedAt'
  };

  export type TmdbMetadataScalarFieldEnum = (typeof TmdbMetadataScalarFieldEnum)[keyof typeof TmdbMetadataScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const UserOrderByRelevanceFieldEnum: {
    name: 'name',
    email: 'email',
    password: 'password',
    lastLoginIp: 'lastLoginIp'
  };

  export type UserOrderByRelevanceFieldEnum = (typeof UserOrderByRelevanceFieldEnum)[keyof typeof UserOrderByRelevanceFieldEnum]


  export const DeviceUserOrderByRelevanceFieldEnum: {
    deviceId: 'deviceId',
    softwareId: 'softwareId',
    mac: 'mac',
    brand: 'brand',
    model: 'model',
    serial: 'serial',
    publicIp: 'publicIp',
    appVersion: 'appVersion',
    osVersion: 'osVersion'
  };

  export type DeviceUserOrderByRelevanceFieldEnum = (typeof DeviceUserOrderByRelevanceFieldEnum)[keyof typeof DeviceUserOrderByRelevanceFieldEnum]


  export const XtreamServerOrderByRelevanceFieldEnum: {
    name: 'name',
    url: 'url',
    serverIdentity: 'serverIdentity'
  };

  export type XtreamServerOrderByRelevanceFieldEnum = (typeof XtreamServerOrderByRelevanceFieldEnum)[keyof typeof XtreamServerOrderByRelevanceFieldEnum]


  export const LicenseOrderByRelevanceFieldEnum: {
    key: 'key',
    xtreamUser: 'xtreamUser',
    xtreamPass: 'xtreamPass'
  };

  export type LicenseOrderByRelevanceFieldEnum = (typeof LicenseOrderByRelevanceFieldEnum)[keyof typeof LicenseOrderByRelevanceFieldEnum]


  export const AuditLogOrderByRelevanceFieldEnum: {
    entity: 'entity',
    details: 'details',
    ipAddress: 'ipAddress'
  };

  export type AuditLogOrderByRelevanceFieldEnum = (typeof AuditLogOrderByRelevanceFieldEnum)[keyof typeof AuditLogOrderByRelevanceFieldEnum]


  export const SessionOrderByRelevanceFieldEnum: {
    refreshToken: 'refreshToken'
  };

  export type SessionOrderByRelevanceFieldEnum = (typeof SessionOrderByRelevanceFieldEnum)[keyof typeof SessionOrderByRelevanceFieldEnum]


  export const DeviceTokenOrderByRelevanceFieldEnum: {
    token: 'token',
    settingsCode: 'settingsCode',
    deviceId: 'deviceId',
    mac: 'mac'
  };

  export type DeviceTokenOrderByRelevanceFieldEnum = (typeof DeviceTokenOrderByRelevanceFieldEnum)[keyof typeof DeviceTokenOrderByRelevanceFieldEnum]


  export const DeviceBlacklistOrderByRelevanceFieldEnum: {
    deviceId: 'deviceId',
    mac: 'mac',
    details: 'details'
  };

  export type DeviceBlacklistOrderByRelevanceFieldEnum = (typeof DeviceBlacklistOrderByRelevanceFieldEnum)[keyof typeof DeviceBlacklistOrderByRelevanceFieldEnum]


  export const PlaybackActivityOrderByRelevanceFieldEnum: {
    movieId: 'movieId',
    type: 'type',
    profileId: 'profileId',
    status: 'status'
  };

  export type PlaybackActivityOrderByRelevanceFieldEnum = (typeof PlaybackActivityOrderByRelevanceFieldEnum)[keyof typeof PlaybackActivityOrderByRelevanceFieldEnum]


  export const ResumeProgressOrderByRelevanceFieldEnum: {
    profileId: 'profileId',
    contentId: 'contentId'
  };

  export type ResumeProgressOrderByRelevanceFieldEnum = (typeof ResumeProgressOrderByRelevanceFieldEnum)[keyof typeof ResumeProgressOrderByRelevanceFieldEnum]


  export const ParentalConfigOrderByRelevanceFieldEnum: {
    pin: 'pin',
    lockedCategories: 'lockedCategories'
  };

  export type ParentalConfigOrderByRelevanceFieldEnum = (typeof ParentalConfigOrderByRelevanceFieldEnum)[keyof typeof ParentalConfigOrderByRelevanceFieldEnum]


  export const ThemeConfigOrderByRelevanceFieldEnum: {
    primaryColor: 'primaryColor',
    secondaryColor: 'secondaryColor',
    accentColor: 'accentColor',
    logoUrl: 'logoUrl',
    backgroundUrl: 'backgroundUrl'
  };

  export type ThemeConfigOrderByRelevanceFieldEnum = (typeof ThemeConfigOrderByRelevanceFieldEnum)[keyof typeof ThemeConfigOrderByRelevanceFieldEnum]


  export const ProfileOrderByRelevanceFieldEnum: {
    id: 'id',
    name: 'name',
    avatarUrl: 'avatarUrl',
    pin: 'pin'
  };

  export type ProfileOrderByRelevanceFieldEnum = (typeof ProfileOrderByRelevanceFieldEnum)[keyof typeof ProfileOrderByRelevanceFieldEnum]


  export const TmdbMetadataOrderByRelevanceFieldEnum: {
    contentId: 'contentId',
    title: 'title',
    overview: 'overview',
    posterPath: 'posterPath',
    backdropPath: 'backdropPath',
    ageRating: 'ageRating',
    releaseDate: 'releaseDate',
    genres: 'genres',
    cast: 'cast'
  };

  export type TmdbMetadataOrderByRelevanceFieldEnum = (typeof TmdbMetadataOrderByRelevanceFieldEnum)[keyof typeof TmdbMetadataOrderByRelevanceFieldEnum]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'UserRole'
   */
  export type EnumUserRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'UserRole'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    


  /**
   * Reference to a field of type 'AuthProvider'
   */
  export type EnumAuthProviderFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuthProvider'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Platform'
   */
  export type EnumPlatformFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Platform'>
    


  /**
   * Reference to a field of type 'LicensePlan'
   */
  export type EnumLicensePlanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LicensePlan'>
    


  /**
   * Reference to a field of type 'LicenseStatus'
   */
  export type EnumLicenseStatusFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'LicenseStatus'>
    


  /**
   * Reference to a field of type 'AuditAction'
   */
  export type EnumAuditActionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'AuditAction'>
    


  /**
   * Reference to a field of type 'BlacklistReason'
   */
  export type EnumBlacklistReasonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'BlacklistReason'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: IntFilter<"User"> | number
    name?: StringFilter<"User"> | string
    email?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    isActive?: BoolFilter<"User"> | boolean
    authProvider?: EnumAuthProviderFilter<"User"> | $Enums.AuthProvider
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLoginIp?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    devices?: DeviceUserListRelationFilter
    licenses?: LicenseListRelationFilter
    auditLogs?: AuditLogListRelationFilter
    sessions?: SessionListRelationFilter
    profiles?: ProfileListRelationFilter
    parentalConfig?: XOR<ParentalConfigNullableScalarRelationFilter, ParentalConfigWhereInput> | null
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    authProvider?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    lastLoginIp?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    devices?: DeviceUserOrderByRelationAggregateInput
    licenses?: LicenseOrderByRelationAggregateInput
    auditLogs?: AuditLogOrderByRelationAggregateInput
    sessions?: SessionOrderByRelationAggregateInput
    profiles?: ProfileOrderByRelationAggregateInput
    parentalConfig?: ParentalConfigOrderByWithRelationInput
    _relevance?: UserOrderByRelevanceInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    name?: StringFilter<"User"> | string
    password?: StringFilter<"User"> | string
    role?: EnumUserRoleFilter<"User"> | $Enums.UserRole
    isActive?: BoolFilter<"User"> | boolean
    authProvider?: EnumAuthProviderFilter<"User"> | $Enums.AuthProvider
    lastLoginAt?: DateTimeNullableFilter<"User"> | Date | string | null
    lastLoginIp?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    deletedAt?: DateTimeNullableFilter<"User"> | Date | string | null
    devices?: DeviceUserListRelationFilter
    licenses?: LicenseListRelationFilter
    auditLogs?: AuditLogListRelationFilter
    sessions?: SessionListRelationFilter
    profiles?: ProfileListRelationFilter
    parentalConfig?: XOR<ParentalConfigNullableScalarRelationFilter, ParentalConfigWhereInput> | null
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    authProvider?: SortOrder
    lastLoginAt?: SortOrderInput | SortOrder
    lastLoginIp?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: UserCountOrderByAggregateInput
    _avg?: UserAvgOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
    _sum?: UserSumOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"User"> | number
    name?: StringWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    password?: StringWithAggregatesFilter<"User"> | string
    role?: EnumUserRoleWithAggregatesFilter<"User"> | $Enums.UserRole
    isActive?: BoolWithAggregatesFilter<"User"> | boolean
    authProvider?: EnumAuthProviderWithAggregatesFilter<"User"> | $Enums.AuthProvider
    lastLoginAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
    lastLoginIp?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"User"> | Date | string | null
  }

  export type DeviceUserWhereInput = {
    AND?: DeviceUserWhereInput | DeviceUserWhereInput[]
    OR?: DeviceUserWhereInput[]
    NOT?: DeviceUserWhereInput | DeviceUserWhereInput[]
    id?: IntFilter<"DeviceUser"> | number
    deviceId?: StringFilter<"DeviceUser"> | string
    softwareId?: StringNullableFilter<"DeviceUser"> | string | null
    mac?: StringNullableFilter<"DeviceUser"> | string | null
    brand?: StringNullableFilter<"DeviceUser"> | string | null
    model?: StringNullableFilter<"DeviceUser"> | string | null
    serial?: StringNullableFilter<"DeviceUser"> | string | null
    platform?: EnumPlatformNullableFilter<"DeviceUser"> | $Enums.Platform | null
    publicIp?: StringNullableFilter<"DeviceUser"> | string | null
    appVersion?: StringNullableFilter<"DeviceUser"> | string | null
    osVersion?: StringNullableFilter<"DeviceUser"> | string | null
    lastSeenAt?: DateTimeNullableFilter<"DeviceUser"> | Date | string | null
    userId?: IntNullableFilter<"DeviceUser"> | number | null
    createdAt?: DateTimeFilter<"DeviceUser"> | Date | string
    updatedAt?: DateTimeFilter<"DeviceUser"> | Date | string
    deletedAt?: DateTimeNullableFilter<"DeviceUser"> | Date | string | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    licenses?: LicenseListRelationFilter
  }

  export type DeviceUserOrderByWithRelationInput = {
    id?: SortOrder
    deviceId?: SortOrder
    softwareId?: SortOrderInput | SortOrder
    mac?: SortOrderInput | SortOrder
    brand?: SortOrderInput | SortOrder
    model?: SortOrderInput | SortOrder
    serial?: SortOrderInput | SortOrder
    platform?: SortOrderInput | SortOrder
    publicIp?: SortOrderInput | SortOrder
    appVersion?: SortOrderInput | SortOrder
    osVersion?: SortOrderInput | SortOrder
    lastSeenAt?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
    licenses?: LicenseOrderByRelationAggregateInput
    _relevance?: DeviceUserOrderByRelevanceInput
  }

  export type DeviceUserWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    deviceId?: string
    softwareId?: string
    AND?: DeviceUserWhereInput | DeviceUserWhereInput[]
    OR?: DeviceUserWhereInput[]
    NOT?: DeviceUserWhereInput | DeviceUserWhereInput[]
    mac?: StringNullableFilter<"DeviceUser"> | string | null
    brand?: StringNullableFilter<"DeviceUser"> | string | null
    model?: StringNullableFilter<"DeviceUser"> | string | null
    serial?: StringNullableFilter<"DeviceUser"> | string | null
    platform?: EnumPlatformNullableFilter<"DeviceUser"> | $Enums.Platform | null
    publicIp?: StringNullableFilter<"DeviceUser"> | string | null
    appVersion?: StringNullableFilter<"DeviceUser"> | string | null
    osVersion?: StringNullableFilter<"DeviceUser"> | string | null
    lastSeenAt?: DateTimeNullableFilter<"DeviceUser"> | Date | string | null
    userId?: IntNullableFilter<"DeviceUser"> | number | null
    createdAt?: DateTimeFilter<"DeviceUser"> | Date | string
    updatedAt?: DateTimeFilter<"DeviceUser"> | Date | string
    deletedAt?: DateTimeNullableFilter<"DeviceUser"> | Date | string | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    licenses?: LicenseListRelationFilter
  }, "id" | "deviceId" | "softwareId">

  export type DeviceUserOrderByWithAggregationInput = {
    id?: SortOrder
    deviceId?: SortOrder
    softwareId?: SortOrderInput | SortOrder
    mac?: SortOrderInput | SortOrder
    brand?: SortOrderInput | SortOrder
    model?: SortOrderInput | SortOrder
    serial?: SortOrderInput | SortOrder
    platform?: SortOrderInput | SortOrder
    publicIp?: SortOrderInput | SortOrder
    appVersion?: SortOrderInput | SortOrder
    osVersion?: SortOrderInput | SortOrder
    lastSeenAt?: SortOrderInput | SortOrder
    userId?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: DeviceUserCountOrderByAggregateInput
    _avg?: DeviceUserAvgOrderByAggregateInput
    _max?: DeviceUserMaxOrderByAggregateInput
    _min?: DeviceUserMinOrderByAggregateInput
    _sum?: DeviceUserSumOrderByAggregateInput
  }

  export type DeviceUserScalarWhereWithAggregatesInput = {
    AND?: DeviceUserScalarWhereWithAggregatesInput | DeviceUserScalarWhereWithAggregatesInput[]
    OR?: DeviceUserScalarWhereWithAggregatesInput[]
    NOT?: DeviceUserScalarWhereWithAggregatesInput | DeviceUserScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"DeviceUser"> | number
    deviceId?: StringWithAggregatesFilter<"DeviceUser"> | string
    softwareId?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    mac?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    brand?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    model?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    serial?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    platform?: EnumPlatformNullableWithAggregatesFilter<"DeviceUser"> | $Enums.Platform | null
    publicIp?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    appVersion?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    osVersion?: StringNullableWithAggregatesFilter<"DeviceUser"> | string | null
    lastSeenAt?: DateTimeNullableWithAggregatesFilter<"DeviceUser"> | Date | string | null
    userId?: IntNullableWithAggregatesFilter<"DeviceUser"> | number | null
    createdAt?: DateTimeWithAggregatesFilter<"DeviceUser"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"DeviceUser"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"DeviceUser"> | Date | string | null
  }

  export type XtreamServerWhereInput = {
    AND?: XtreamServerWhereInput | XtreamServerWhereInput[]
    OR?: XtreamServerWhereInput[]
    NOT?: XtreamServerWhereInput | XtreamServerWhereInput[]
    id?: IntFilter<"XtreamServer"> | number
    name?: StringFilter<"XtreamServer"> | string
    url?: StringFilter<"XtreamServer"> | string
    serverIdentity?: StringFilter<"XtreamServer"> | string
    isActive?: BoolFilter<"XtreamServer"> | boolean
    isDefault?: BoolFilter<"XtreamServer"> | boolean
    createdAt?: DateTimeFilter<"XtreamServer"> | Date | string
    updatedAt?: DateTimeFilter<"XtreamServer"> | Date | string
    licenses?: LicenseListRelationFilter
  }

  export type XtreamServerOrderByWithRelationInput = {
    id?: SortOrder
    name?: SortOrder
    url?: SortOrder
    serverIdentity?: SortOrder
    isActive?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    licenses?: LicenseOrderByRelationAggregateInput
    _relevance?: XtreamServerOrderByRelevanceInput
  }

  export type XtreamServerWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    serverIdentity?: string
    AND?: XtreamServerWhereInput | XtreamServerWhereInput[]
    OR?: XtreamServerWhereInput[]
    NOT?: XtreamServerWhereInput | XtreamServerWhereInput[]
    name?: StringFilter<"XtreamServer"> | string
    url?: StringFilter<"XtreamServer"> | string
    isActive?: BoolFilter<"XtreamServer"> | boolean
    isDefault?: BoolFilter<"XtreamServer"> | boolean
    createdAt?: DateTimeFilter<"XtreamServer"> | Date | string
    updatedAt?: DateTimeFilter<"XtreamServer"> | Date | string
    licenses?: LicenseListRelationFilter
  }, "id" | "serverIdentity">

  export type XtreamServerOrderByWithAggregationInput = {
    id?: SortOrder
    name?: SortOrder
    url?: SortOrder
    serverIdentity?: SortOrder
    isActive?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: XtreamServerCountOrderByAggregateInput
    _avg?: XtreamServerAvgOrderByAggregateInput
    _max?: XtreamServerMaxOrderByAggregateInput
    _min?: XtreamServerMinOrderByAggregateInput
    _sum?: XtreamServerSumOrderByAggregateInput
  }

  export type XtreamServerScalarWhereWithAggregatesInput = {
    AND?: XtreamServerScalarWhereWithAggregatesInput | XtreamServerScalarWhereWithAggregatesInput[]
    OR?: XtreamServerScalarWhereWithAggregatesInput[]
    NOT?: XtreamServerScalarWhereWithAggregatesInput | XtreamServerScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"XtreamServer"> | number
    name?: StringWithAggregatesFilter<"XtreamServer"> | string
    url?: StringWithAggregatesFilter<"XtreamServer"> | string
    serverIdentity?: StringWithAggregatesFilter<"XtreamServer"> | string
    isActive?: BoolWithAggregatesFilter<"XtreamServer"> | boolean
    isDefault?: BoolWithAggregatesFilter<"XtreamServer"> | boolean
    createdAt?: DateTimeWithAggregatesFilter<"XtreamServer"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"XtreamServer"> | Date | string
  }

  export type LicenseWhereInput = {
    AND?: LicenseWhereInput | LicenseWhereInput[]
    OR?: LicenseWhereInput[]
    NOT?: LicenseWhereInput | LicenseWhereInput[]
    id?: IntFilter<"License"> | number
    key?: StringFilter<"License"> | string
    userId?: IntNullableFilter<"License"> | number | null
    deviceUserId?: IntNullableFilter<"License"> | number | null
    serverId?: IntNullableFilter<"License"> | number | null
    xtreamUser?: StringNullableFilter<"License"> | string | null
    xtreamPass?: StringNullableFilter<"License"> | string | null
    plan?: EnumLicensePlanFilter<"License"> | $Enums.LicensePlan
    status?: EnumLicenseStatusFilter<"License"> | $Enums.LicenseStatus
    expiresAt?: DateTimeNullableFilter<"License"> | Date | string | null
    activatedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    lastUsedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    createdAt?: DateTimeFilter<"License"> | Date | string
    updatedAt?: DateTimeFilter<"License"> | Date | string
    deletedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    deviceUser?: XOR<DeviceUserNullableScalarRelationFilter, DeviceUserWhereInput> | null
    server?: XOR<XtreamServerNullableScalarRelationFilter, XtreamServerWhereInput> | null
  }

  export type LicenseOrderByWithRelationInput = {
    id?: SortOrder
    key?: SortOrder
    userId?: SortOrderInput | SortOrder
    deviceUserId?: SortOrderInput | SortOrder
    serverId?: SortOrderInput | SortOrder
    xtreamUser?: SortOrderInput | SortOrder
    xtreamPass?: SortOrderInput | SortOrder
    plan?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrderInput | SortOrder
    activatedAt?: SortOrderInput | SortOrder
    lastUsedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    user?: UserOrderByWithRelationInput
    deviceUser?: DeviceUserOrderByWithRelationInput
    server?: XtreamServerOrderByWithRelationInput
    _relevance?: LicenseOrderByRelevanceInput
  }

  export type LicenseWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    key?: string
    AND?: LicenseWhereInput | LicenseWhereInput[]
    OR?: LicenseWhereInput[]
    NOT?: LicenseWhereInput | LicenseWhereInput[]
    userId?: IntNullableFilter<"License"> | number | null
    deviceUserId?: IntNullableFilter<"License"> | number | null
    serverId?: IntNullableFilter<"License"> | number | null
    xtreamUser?: StringNullableFilter<"License"> | string | null
    xtreamPass?: StringNullableFilter<"License"> | string | null
    plan?: EnumLicensePlanFilter<"License"> | $Enums.LicensePlan
    status?: EnumLicenseStatusFilter<"License"> | $Enums.LicenseStatus
    expiresAt?: DateTimeNullableFilter<"License"> | Date | string | null
    activatedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    lastUsedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    createdAt?: DateTimeFilter<"License"> | Date | string
    updatedAt?: DateTimeFilter<"License"> | Date | string
    deletedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    deviceUser?: XOR<DeviceUserNullableScalarRelationFilter, DeviceUserWhereInput> | null
    server?: XOR<XtreamServerNullableScalarRelationFilter, XtreamServerWhereInput> | null
  }, "id" | "key">

  export type LicenseOrderByWithAggregationInput = {
    id?: SortOrder
    key?: SortOrder
    userId?: SortOrderInput | SortOrder
    deviceUserId?: SortOrderInput | SortOrder
    serverId?: SortOrderInput | SortOrder
    xtreamUser?: SortOrderInput | SortOrder
    xtreamPass?: SortOrderInput | SortOrder
    plan?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrderInput | SortOrder
    activatedAt?: SortOrderInput | SortOrder
    lastUsedAt?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrderInput | SortOrder
    _count?: LicenseCountOrderByAggregateInput
    _avg?: LicenseAvgOrderByAggregateInput
    _max?: LicenseMaxOrderByAggregateInput
    _min?: LicenseMinOrderByAggregateInput
    _sum?: LicenseSumOrderByAggregateInput
  }

  export type LicenseScalarWhereWithAggregatesInput = {
    AND?: LicenseScalarWhereWithAggregatesInput | LicenseScalarWhereWithAggregatesInput[]
    OR?: LicenseScalarWhereWithAggregatesInput[]
    NOT?: LicenseScalarWhereWithAggregatesInput | LicenseScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"License"> | number
    key?: StringWithAggregatesFilter<"License"> | string
    userId?: IntNullableWithAggregatesFilter<"License"> | number | null
    deviceUserId?: IntNullableWithAggregatesFilter<"License"> | number | null
    serverId?: IntNullableWithAggregatesFilter<"License"> | number | null
    xtreamUser?: StringNullableWithAggregatesFilter<"License"> | string | null
    xtreamPass?: StringNullableWithAggregatesFilter<"License"> | string | null
    plan?: EnumLicensePlanWithAggregatesFilter<"License"> | $Enums.LicensePlan
    status?: EnumLicenseStatusWithAggregatesFilter<"License"> | $Enums.LicenseStatus
    expiresAt?: DateTimeNullableWithAggregatesFilter<"License"> | Date | string | null
    activatedAt?: DateTimeNullableWithAggregatesFilter<"License"> | Date | string | null
    lastUsedAt?: DateTimeNullableWithAggregatesFilter<"License"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"License"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"License"> | Date | string
    deletedAt?: DateTimeNullableWithAggregatesFilter<"License"> | Date | string | null
  }

  export type AuditLogWhereInput = {
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    id?: IntFilter<"AuditLog"> | number
    userId?: IntNullableFilter<"AuditLog"> | number | null
    action?: EnumAuditActionFilter<"AuditLog"> | $Enums.AuditAction
    entity?: StringFilter<"AuditLog"> | string
    entityId?: IntNullableFilter<"AuditLog"> | number | null
    details?: StringNullableFilter<"AuditLog"> | string | null
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }

  export type AuditLogOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrderInput | SortOrder
    details?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
    _relevance?: AuditLogOrderByRelevanceInput
  }

  export type AuditLogWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: AuditLogWhereInput | AuditLogWhereInput[]
    OR?: AuditLogWhereInput[]
    NOT?: AuditLogWhereInput | AuditLogWhereInput[]
    userId?: IntNullableFilter<"AuditLog"> | number | null
    action?: EnumAuditActionFilter<"AuditLog"> | $Enums.AuditAction
    entity?: StringFilter<"AuditLog"> | string
    entityId?: IntNullableFilter<"AuditLog"> | number | null
    details?: StringNullableFilter<"AuditLog"> | string | null
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
    user?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
  }, "id">

  export type AuditLogOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrderInput | SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrderInput | SortOrder
    details?: SortOrderInput | SortOrder
    ipAddress?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: AuditLogCountOrderByAggregateInput
    _avg?: AuditLogAvgOrderByAggregateInput
    _max?: AuditLogMaxOrderByAggregateInput
    _min?: AuditLogMinOrderByAggregateInput
    _sum?: AuditLogSumOrderByAggregateInput
  }

  export type AuditLogScalarWhereWithAggregatesInput = {
    AND?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    OR?: AuditLogScalarWhereWithAggregatesInput[]
    NOT?: AuditLogScalarWhereWithAggregatesInput | AuditLogScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"AuditLog"> | number
    userId?: IntNullableWithAggregatesFilter<"AuditLog"> | number | null
    action?: EnumAuditActionWithAggregatesFilter<"AuditLog"> | $Enums.AuditAction
    entity?: StringWithAggregatesFilter<"AuditLog"> | string
    entityId?: IntNullableWithAggregatesFilter<"AuditLog"> | number | null
    details?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    ipAddress?: StringNullableWithAggregatesFilter<"AuditLog"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"AuditLog"> | Date | string
  }

  export type SessionWhereInput = {
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    id?: IntFilter<"Session"> | number
    userId?: IntFilter<"Session"> | number
    refreshToken?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type SessionOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    user?: UserOrderByWithRelationInput
    _relevance?: SessionOrderByRelevanceInput
  }

  export type SessionWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    refreshToken?: string
    AND?: SessionWhereInput | SessionWhereInput[]
    OR?: SessionWhereInput[]
    NOT?: SessionWhereInput | SessionWhereInput[]
    userId?: IntFilter<"Session"> | number
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "refreshToken">

  export type SessionOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    _count?: SessionCountOrderByAggregateInput
    _avg?: SessionAvgOrderByAggregateInput
    _max?: SessionMaxOrderByAggregateInput
    _min?: SessionMinOrderByAggregateInput
    _sum?: SessionSumOrderByAggregateInput
  }

  export type SessionScalarWhereWithAggregatesInput = {
    AND?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    OR?: SessionScalarWhereWithAggregatesInput[]
    NOT?: SessionScalarWhereWithAggregatesInput | SessionScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"Session"> | number
    userId?: IntWithAggregatesFilter<"Session"> | number
    refreshToken?: StringWithAggregatesFilter<"Session"> | string
    expiresAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"Session"> | Date | string
  }

  export type DeviceTokenWhereInput = {
    AND?: DeviceTokenWhereInput | DeviceTokenWhereInput[]
    OR?: DeviceTokenWhereInput[]
    NOT?: DeviceTokenWhereInput | DeviceTokenWhereInput[]
    id?: IntFilter<"DeviceToken"> | number
    token?: StringFilter<"DeviceToken"> | string
    settingsCode?: StringFilter<"DeviceToken"> | string
    deviceId?: StringFilter<"DeviceToken"> | string
    mac?: StringFilter<"DeviceToken"> | string
    isUsed?: BoolFilter<"DeviceToken"> | boolean
    expiresAt?: DateTimeFilter<"DeviceToken"> | Date | string
    createdAt?: DateTimeFilter<"DeviceToken"> | Date | string
  }

  export type DeviceTokenOrderByWithRelationInput = {
    id?: SortOrder
    token?: SortOrder
    settingsCode?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    isUsed?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    _relevance?: DeviceTokenOrderByRelevanceInput
  }

  export type DeviceTokenWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    token?: string
    settingsCode?: string
    AND?: DeviceTokenWhereInput | DeviceTokenWhereInput[]
    OR?: DeviceTokenWhereInput[]
    NOT?: DeviceTokenWhereInput | DeviceTokenWhereInput[]
    deviceId?: StringFilter<"DeviceToken"> | string
    mac?: StringFilter<"DeviceToken"> | string
    isUsed?: BoolFilter<"DeviceToken"> | boolean
    expiresAt?: DateTimeFilter<"DeviceToken"> | Date | string
    createdAt?: DateTimeFilter<"DeviceToken"> | Date | string
  }, "id" | "token" | "settingsCode">

  export type DeviceTokenOrderByWithAggregationInput = {
    id?: SortOrder
    token?: SortOrder
    settingsCode?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    isUsed?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
    _count?: DeviceTokenCountOrderByAggregateInput
    _avg?: DeviceTokenAvgOrderByAggregateInput
    _max?: DeviceTokenMaxOrderByAggregateInput
    _min?: DeviceTokenMinOrderByAggregateInput
    _sum?: DeviceTokenSumOrderByAggregateInput
  }

  export type DeviceTokenScalarWhereWithAggregatesInput = {
    AND?: DeviceTokenScalarWhereWithAggregatesInput | DeviceTokenScalarWhereWithAggregatesInput[]
    OR?: DeviceTokenScalarWhereWithAggregatesInput[]
    NOT?: DeviceTokenScalarWhereWithAggregatesInput | DeviceTokenScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"DeviceToken"> | number
    token?: StringWithAggregatesFilter<"DeviceToken"> | string
    settingsCode?: StringWithAggregatesFilter<"DeviceToken"> | string
    deviceId?: StringWithAggregatesFilter<"DeviceToken"> | string
    mac?: StringWithAggregatesFilter<"DeviceToken"> | string
    isUsed?: BoolWithAggregatesFilter<"DeviceToken"> | boolean
    expiresAt?: DateTimeWithAggregatesFilter<"DeviceToken"> | Date | string
    createdAt?: DateTimeWithAggregatesFilter<"DeviceToken"> | Date | string
  }

  export type DeviceBlacklistWhereInput = {
    AND?: DeviceBlacklistWhereInput | DeviceBlacklistWhereInput[]
    OR?: DeviceBlacklistWhereInput[]
    NOT?: DeviceBlacklistWhereInput | DeviceBlacklistWhereInput[]
    id?: IntFilter<"DeviceBlacklist"> | number
    deviceId?: StringNullableFilter<"DeviceBlacklist"> | string | null
    mac?: StringNullableFilter<"DeviceBlacklist"> | string | null
    reason?: EnumBlacklistReasonFilter<"DeviceBlacklist"> | $Enums.BlacklistReason
    details?: StringNullableFilter<"DeviceBlacklist"> | string | null
    createdAt?: DateTimeFilter<"DeviceBlacklist"> | Date | string
  }

  export type DeviceBlacklistOrderByWithRelationInput = {
    id?: SortOrder
    deviceId?: SortOrderInput | SortOrder
    mac?: SortOrderInput | SortOrder
    reason?: SortOrder
    details?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _relevance?: DeviceBlacklistOrderByRelevanceInput
  }

  export type DeviceBlacklistWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: DeviceBlacklistWhereInput | DeviceBlacklistWhereInput[]
    OR?: DeviceBlacklistWhereInput[]
    NOT?: DeviceBlacklistWhereInput | DeviceBlacklistWhereInput[]
    deviceId?: StringNullableFilter<"DeviceBlacklist"> | string | null
    mac?: StringNullableFilter<"DeviceBlacklist"> | string | null
    reason?: EnumBlacklistReasonFilter<"DeviceBlacklist"> | $Enums.BlacklistReason
    details?: StringNullableFilter<"DeviceBlacklist"> | string | null
    createdAt?: DateTimeFilter<"DeviceBlacklist"> | Date | string
  }, "id">

  export type DeviceBlacklistOrderByWithAggregationInput = {
    id?: SortOrder
    deviceId?: SortOrderInput | SortOrder
    mac?: SortOrderInput | SortOrder
    reason?: SortOrder
    details?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    _count?: DeviceBlacklistCountOrderByAggregateInput
    _avg?: DeviceBlacklistAvgOrderByAggregateInput
    _max?: DeviceBlacklistMaxOrderByAggregateInput
    _min?: DeviceBlacklistMinOrderByAggregateInput
    _sum?: DeviceBlacklistSumOrderByAggregateInput
  }

  export type DeviceBlacklistScalarWhereWithAggregatesInput = {
    AND?: DeviceBlacklistScalarWhereWithAggregatesInput | DeviceBlacklistScalarWhereWithAggregatesInput[]
    OR?: DeviceBlacklistScalarWhereWithAggregatesInput[]
    NOT?: DeviceBlacklistScalarWhereWithAggregatesInput | DeviceBlacklistScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"DeviceBlacklist"> | number
    deviceId?: StringNullableWithAggregatesFilter<"DeviceBlacklist"> | string | null
    mac?: StringNullableWithAggregatesFilter<"DeviceBlacklist"> | string | null
    reason?: EnumBlacklistReasonWithAggregatesFilter<"DeviceBlacklist"> | $Enums.BlacklistReason
    details?: StringNullableWithAggregatesFilter<"DeviceBlacklist"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"DeviceBlacklist"> | Date | string
  }

  export type PlaybackActivityWhereInput = {
    AND?: PlaybackActivityWhereInput | PlaybackActivityWhereInput[]
    OR?: PlaybackActivityWhereInput[]
    NOT?: PlaybackActivityWhereInput | PlaybackActivityWhereInput[]
    id?: IntFilter<"PlaybackActivity"> | number
    movieId?: StringFilter<"PlaybackActivity"> | string
    type?: StringFilter<"PlaybackActivity"> | string
    profileId?: StringNullableFilter<"PlaybackActivity"> | string | null
    status?: StringFilter<"PlaybackActivity"> | string
    timestamp?: DateTimeFilter<"PlaybackActivity"> | Date | string
  }

  export type PlaybackActivityOrderByWithRelationInput = {
    id?: SortOrder
    movieId?: SortOrder
    type?: SortOrder
    profileId?: SortOrderInput | SortOrder
    status?: SortOrder
    timestamp?: SortOrder
    _relevance?: PlaybackActivityOrderByRelevanceInput
  }

  export type PlaybackActivityWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: PlaybackActivityWhereInput | PlaybackActivityWhereInput[]
    OR?: PlaybackActivityWhereInput[]
    NOT?: PlaybackActivityWhereInput | PlaybackActivityWhereInput[]
    movieId?: StringFilter<"PlaybackActivity"> | string
    type?: StringFilter<"PlaybackActivity"> | string
    profileId?: StringNullableFilter<"PlaybackActivity"> | string | null
    status?: StringFilter<"PlaybackActivity"> | string
    timestamp?: DateTimeFilter<"PlaybackActivity"> | Date | string
  }, "id">

  export type PlaybackActivityOrderByWithAggregationInput = {
    id?: SortOrder
    movieId?: SortOrder
    type?: SortOrder
    profileId?: SortOrderInput | SortOrder
    status?: SortOrder
    timestamp?: SortOrder
    _count?: PlaybackActivityCountOrderByAggregateInput
    _avg?: PlaybackActivityAvgOrderByAggregateInput
    _max?: PlaybackActivityMaxOrderByAggregateInput
    _min?: PlaybackActivityMinOrderByAggregateInput
    _sum?: PlaybackActivitySumOrderByAggregateInput
  }

  export type PlaybackActivityScalarWhereWithAggregatesInput = {
    AND?: PlaybackActivityScalarWhereWithAggregatesInput | PlaybackActivityScalarWhereWithAggregatesInput[]
    OR?: PlaybackActivityScalarWhereWithAggregatesInput[]
    NOT?: PlaybackActivityScalarWhereWithAggregatesInput | PlaybackActivityScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"PlaybackActivity"> | number
    movieId?: StringWithAggregatesFilter<"PlaybackActivity"> | string
    type?: StringWithAggregatesFilter<"PlaybackActivity"> | string
    profileId?: StringNullableWithAggregatesFilter<"PlaybackActivity"> | string | null
    status?: StringWithAggregatesFilter<"PlaybackActivity"> | string
    timestamp?: DateTimeWithAggregatesFilter<"PlaybackActivity"> | Date | string
  }

  export type ResumeProgressWhereInput = {
    AND?: ResumeProgressWhereInput | ResumeProgressWhereInput[]
    OR?: ResumeProgressWhereInput[]
    NOT?: ResumeProgressWhereInput | ResumeProgressWhereInput[]
    id?: IntFilter<"ResumeProgress"> | number
    profileId?: StringFilter<"ResumeProgress"> | string
    contentId?: StringFilter<"ResumeProgress"> | string
    progressMs?: IntFilter<"ResumeProgress"> | number
    durationMs?: IntFilter<"ResumeProgress"> | number
    lastUpdated?: DateTimeFilter<"ResumeProgress"> | Date | string
  }

  export type ResumeProgressOrderByWithRelationInput = {
    id?: SortOrder
    profileId?: SortOrder
    contentId?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
    lastUpdated?: SortOrder
    _relevance?: ResumeProgressOrderByRelevanceInput
  }

  export type ResumeProgressWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    profileId_contentId?: ResumeProgressProfileIdContentIdCompoundUniqueInput
    AND?: ResumeProgressWhereInput | ResumeProgressWhereInput[]
    OR?: ResumeProgressWhereInput[]
    NOT?: ResumeProgressWhereInput | ResumeProgressWhereInput[]
    profileId?: StringFilter<"ResumeProgress"> | string
    contentId?: StringFilter<"ResumeProgress"> | string
    progressMs?: IntFilter<"ResumeProgress"> | number
    durationMs?: IntFilter<"ResumeProgress"> | number
    lastUpdated?: DateTimeFilter<"ResumeProgress"> | Date | string
  }, "id" | "profileId_contentId">

  export type ResumeProgressOrderByWithAggregationInput = {
    id?: SortOrder
    profileId?: SortOrder
    contentId?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
    lastUpdated?: SortOrder
    _count?: ResumeProgressCountOrderByAggregateInput
    _avg?: ResumeProgressAvgOrderByAggregateInput
    _max?: ResumeProgressMaxOrderByAggregateInput
    _min?: ResumeProgressMinOrderByAggregateInput
    _sum?: ResumeProgressSumOrderByAggregateInput
  }

  export type ResumeProgressScalarWhereWithAggregatesInput = {
    AND?: ResumeProgressScalarWhereWithAggregatesInput | ResumeProgressScalarWhereWithAggregatesInput[]
    OR?: ResumeProgressScalarWhereWithAggregatesInput[]
    NOT?: ResumeProgressScalarWhereWithAggregatesInput | ResumeProgressScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ResumeProgress"> | number
    profileId?: StringWithAggregatesFilter<"ResumeProgress"> | string
    contentId?: StringWithAggregatesFilter<"ResumeProgress"> | string
    progressMs?: IntWithAggregatesFilter<"ResumeProgress"> | number
    durationMs?: IntWithAggregatesFilter<"ResumeProgress"> | number
    lastUpdated?: DateTimeWithAggregatesFilter<"ResumeProgress"> | Date | string
  }

  export type ParentalConfigWhereInput = {
    AND?: ParentalConfigWhereInput | ParentalConfigWhereInput[]
    OR?: ParentalConfigWhereInput[]
    NOT?: ParentalConfigWhereInput | ParentalConfigWhereInput[]
    id?: IntFilter<"ParentalConfig"> | number
    userId?: IntFilter<"ParentalConfig"> | number
    pin?: StringFilter<"ParentalConfig"> | string
    lockedCategories?: StringFilter<"ParentalConfig"> | string
    isPinEnabled?: BoolFilter<"ParentalConfig"> | boolean
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ParentalConfigOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    pin?: SortOrder
    lockedCategories?: SortOrder
    isPinEnabled?: SortOrder
    user?: UserOrderByWithRelationInput
    _relevance?: ParentalConfigOrderByRelevanceInput
  }

  export type ParentalConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    userId?: number
    AND?: ParentalConfigWhereInput | ParentalConfigWhereInput[]
    OR?: ParentalConfigWhereInput[]
    NOT?: ParentalConfigWhereInput | ParentalConfigWhereInput[]
    pin?: StringFilter<"ParentalConfig"> | string
    lockedCategories?: StringFilter<"ParentalConfig"> | string
    isPinEnabled?: BoolFilter<"ParentalConfig"> | boolean
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id" | "userId">

  export type ParentalConfigOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    pin?: SortOrder
    lockedCategories?: SortOrder
    isPinEnabled?: SortOrder
    _count?: ParentalConfigCountOrderByAggregateInput
    _avg?: ParentalConfigAvgOrderByAggregateInput
    _max?: ParentalConfigMaxOrderByAggregateInput
    _min?: ParentalConfigMinOrderByAggregateInput
    _sum?: ParentalConfigSumOrderByAggregateInput
  }

  export type ParentalConfigScalarWhereWithAggregatesInput = {
    AND?: ParentalConfigScalarWhereWithAggregatesInput | ParentalConfigScalarWhereWithAggregatesInput[]
    OR?: ParentalConfigScalarWhereWithAggregatesInput[]
    NOT?: ParentalConfigScalarWhereWithAggregatesInput | ParentalConfigScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ParentalConfig"> | number
    userId?: IntWithAggregatesFilter<"ParentalConfig"> | number
    pin?: StringWithAggregatesFilter<"ParentalConfig"> | string
    lockedCategories?: StringWithAggregatesFilter<"ParentalConfig"> | string
    isPinEnabled?: BoolWithAggregatesFilter<"ParentalConfig"> | boolean
  }

  export type ThemeConfigWhereInput = {
    AND?: ThemeConfigWhereInput | ThemeConfigWhereInput[]
    OR?: ThemeConfigWhereInput[]
    NOT?: ThemeConfigWhereInput | ThemeConfigWhereInput[]
    id?: IntFilter<"ThemeConfig"> | number
    primaryColor?: StringFilter<"ThemeConfig"> | string
    secondaryColor?: StringFilter<"ThemeConfig"> | string
    accentColor?: StringFilter<"ThemeConfig"> | string
    logoUrl?: StringNullableFilter<"ThemeConfig"> | string | null
    backgroundUrl?: StringNullableFilter<"ThemeConfig"> | string | null
    isLive?: BoolFilter<"ThemeConfig"> | boolean
    updatedAt?: DateTimeFilter<"ThemeConfig"> | Date | string
  }

  export type ThemeConfigOrderByWithRelationInput = {
    id?: SortOrder
    primaryColor?: SortOrder
    secondaryColor?: SortOrder
    accentColor?: SortOrder
    logoUrl?: SortOrderInput | SortOrder
    backgroundUrl?: SortOrderInput | SortOrder
    isLive?: SortOrder
    updatedAt?: SortOrder
    _relevance?: ThemeConfigOrderByRelevanceInput
  }

  export type ThemeConfigWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: ThemeConfigWhereInput | ThemeConfigWhereInput[]
    OR?: ThemeConfigWhereInput[]
    NOT?: ThemeConfigWhereInput | ThemeConfigWhereInput[]
    primaryColor?: StringFilter<"ThemeConfig"> | string
    secondaryColor?: StringFilter<"ThemeConfig"> | string
    accentColor?: StringFilter<"ThemeConfig"> | string
    logoUrl?: StringNullableFilter<"ThemeConfig"> | string | null
    backgroundUrl?: StringNullableFilter<"ThemeConfig"> | string | null
    isLive?: BoolFilter<"ThemeConfig"> | boolean
    updatedAt?: DateTimeFilter<"ThemeConfig"> | Date | string
  }, "id">

  export type ThemeConfigOrderByWithAggregationInput = {
    id?: SortOrder
    primaryColor?: SortOrder
    secondaryColor?: SortOrder
    accentColor?: SortOrder
    logoUrl?: SortOrderInput | SortOrder
    backgroundUrl?: SortOrderInput | SortOrder
    isLive?: SortOrder
    updatedAt?: SortOrder
    _count?: ThemeConfigCountOrderByAggregateInput
    _avg?: ThemeConfigAvgOrderByAggregateInput
    _max?: ThemeConfigMaxOrderByAggregateInput
    _min?: ThemeConfigMinOrderByAggregateInput
    _sum?: ThemeConfigSumOrderByAggregateInput
  }

  export type ThemeConfigScalarWhereWithAggregatesInput = {
    AND?: ThemeConfigScalarWhereWithAggregatesInput | ThemeConfigScalarWhereWithAggregatesInput[]
    OR?: ThemeConfigScalarWhereWithAggregatesInput[]
    NOT?: ThemeConfigScalarWhereWithAggregatesInput | ThemeConfigScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"ThemeConfig"> | number
    primaryColor?: StringWithAggregatesFilter<"ThemeConfig"> | string
    secondaryColor?: StringWithAggregatesFilter<"ThemeConfig"> | string
    accentColor?: StringWithAggregatesFilter<"ThemeConfig"> | string
    logoUrl?: StringNullableWithAggregatesFilter<"ThemeConfig"> | string | null
    backgroundUrl?: StringNullableWithAggregatesFilter<"ThemeConfig"> | string | null
    isLive?: BoolWithAggregatesFilter<"ThemeConfig"> | boolean
    updatedAt?: DateTimeWithAggregatesFilter<"ThemeConfig"> | Date | string
  }

  export type ProfileWhereInput = {
    AND?: ProfileWhereInput | ProfileWhereInput[]
    OR?: ProfileWhereInput[]
    NOT?: ProfileWhereInput | ProfileWhereInput[]
    id?: StringFilter<"Profile"> | string
    userId?: IntFilter<"Profile"> | number
    name?: StringFilter<"Profile"> | string
    avatarUrl?: StringNullableFilter<"Profile"> | string | null
    isKids?: BoolFilter<"Profile"> | boolean
    pin?: StringNullableFilter<"Profile"> | string | null
    lastUsed?: DateTimeFilter<"Profile"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }

  export type ProfileOrderByWithRelationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    isKids?: SortOrder
    pin?: SortOrderInput | SortOrder
    lastUsed?: SortOrder
    user?: UserOrderByWithRelationInput
    _relevance?: ProfileOrderByRelevanceInput
  }

  export type ProfileWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: ProfileWhereInput | ProfileWhereInput[]
    OR?: ProfileWhereInput[]
    NOT?: ProfileWhereInput | ProfileWhereInput[]
    userId?: IntFilter<"Profile"> | number
    name?: StringFilter<"Profile"> | string
    avatarUrl?: StringNullableFilter<"Profile"> | string | null
    isKids?: BoolFilter<"Profile"> | boolean
    pin?: StringNullableFilter<"Profile"> | string | null
    lastUsed?: DateTimeFilter<"Profile"> | Date | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
  }, "id">

  export type ProfileOrderByWithAggregationInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrderInput | SortOrder
    isKids?: SortOrder
    pin?: SortOrderInput | SortOrder
    lastUsed?: SortOrder
    _count?: ProfileCountOrderByAggregateInput
    _avg?: ProfileAvgOrderByAggregateInput
    _max?: ProfileMaxOrderByAggregateInput
    _min?: ProfileMinOrderByAggregateInput
    _sum?: ProfileSumOrderByAggregateInput
  }

  export type ProfileScalarWhereWithAggregatesInput = {
    AND?: ProfileScalarWhereWithAggregatesInput | ProfileScalarWhereWithAggregatesInput[]
    OR?: ProfileScalarWhereWithAggregatesInput[]
    NOT?: ProfileScalarWhereWithAggregatesInput | ProfileScalarWhereWithAggregatesInput[]
    id?: StringWithAggregatesFilter<"Profile"> | string
    userId?: IntWithAggregatesFilter<"Profile"> | number
    name?: StringWithAggregatesFilter<"Profile"> | string
    avatarUrl?: StringNullableWithAggregatesFilter<"Profile"> | string | null
    isKids?: BoolWithAggregatesFilter<"Profile"> | boolean
    pin?: StringNullableWithAggregatesFilter<"Profile"> | string | null
    lastUsed?: DateTimeWithAggregatesFilter<"Profile"> | Date | string
  }

  export type TmdbMetadataWhereInput = {
    AND?: TmdbMetadataWhereInput | TmdbMetadataWhereInput[]
    OR?: TmdbMetadataWhereInput[]
    NOT?: TmdbMetadataWhereInput | TmdbMetadataWhereInput[]
    id?: IntFilter<"TmdbMetadata"> | number
    contentId?: StringFilter<"TmdbMetadata"> | string
    tmdbId?: IntNullableFilter<"TmdbMetadata"> | number | null
    title?: StringFilter<"TmdbMetadata"> | string
    overview?: StringNullableFilter<"TmdbMetadata"> | string | null
    posterPath?: StringNullableFilter<"TmdbMetadata"> | string | null
    backdropPath?: StringNullableFilter<"TmdbMetadata"> | string | null
    rating?: FloatNullableFilter<"TmdbMetadata"> | number | null
    ageRating?: StringNullableFilter<"TmdbMetadata"> | string | null
    releaseDate?: StringNullableFilter<"TmdbMetadata"> | string | null
    genres?: StringNullableFilter<"TmdbMetadata"> | string | null
    cast?: StringNullableFilter<"TmdbMetadata"> | string | null
    updatedAt?: DateTimeFilter<"TmdbMetadata"> | Date | string
  }

  export type TmdbMetadataOrderByWithRelationInput = {
    id?: SortOrder
    contentId?: SortOrder
    tmdbId?: SortOrderInput | SortOrder
    title?: SortOrder
    overview?: SortOrderInput | SortOrder
    posterPath?: SortOrderInput | SortOrder
    backdropPath?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    ageRating?: SortOrderInput | SortOrder
    releaseDate?: SortOrderInput | SortOrder
    genres?: SortOrderInput | SortOrder
    cast?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    _relevance?: TmdbMetadataOrderByRelevanceInput
  }

  export type TmdbMetadataWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    contentId?: string
    AND?: TmdbMetadataWhereInput | TmdbMetadataWhereInput[]
    OR?: TmdbMetadataWhereInput[]
    NOT?: TmdbMetadataWhereInput | TmdbMetadataWhereInput[]
    tmdbId?: IntNullableFilter<"TmdbMetadata"> | number | null
    title?: StringFilter<"TmdbMetadata"> | string
    overview?: StringNullableFilter<"TmdbMetadata"> | string | null
    posterPath?: StringNullableFilter<"TmdbMetadata"> | string | null
    backdropPath?: StringNullableFilter<"TmdbMetadata"> | string | null
    rating?: FloatNullableFilter<"TmdbMetadata"> | number | null
    ageRating?: StringNullableFilter<"TmdbMetadata"> | string | null
    releaseDate?: StringNullableFilter<"TmdbMetadata"> | string | null
    genres?: StringNullableFilter<"TmdbMetadata"> | string | null
    cast?: StringNullableFilter<"TmdbMetadata"> | string | null
    updatedAt?: DateTimeFilter<"TmdbMetadata"> | Date | string
  }, "id" | "contentId">

  export type TmdbMetadataOrderByWithAggregationInput = {
    id?: SortOrder
    contentId?: SortOrder
    tmdbId?: SortOrderInput | SortOrder
    title?: SortOrder
    overview?: SortOrderInput | SortOrder
    posterPath?: SortOrderInput | SortOrder
    backdropPath?: SortOrderInput | SortOrder
    rating?: SortOrderInput | SortOrder
    ageRating?: SortOrderInput | SortOrder
    releaseDate?: SortOrderInput | SortOrder
    genres?: SortOrderInput | SortOrder
    cast?: SortOrderInput | SortOrder
    updatedAt?: SortOrder
    _count?: TmdbMetadataCountOrderByAggregateInput
    _avg?: TmdbMetadataAvgOrderByAggregateInput
    _max?: TmdbMetadataMaxOrderByAggregateInput
    _min?: TmdbMetadataMinOrderByAggregateInput
    _sum?: TmdbMetadataSumOrderByAggregateInput
  }

  export type TmdbMetadataScalarWhereWithAggregatesInput = {
    AND?: TmdbMetadataScalarWhereWithAggregatesInput | TmdbMetadataScalarWhereWithAggregatesInput[]
    OR?: TmdbMetadataScalarWhereWithAggregatesInput[]
    NOT?: TmdbMetadataScalarWhereWithAggregatesInput | TmdbMetadataScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"TmdbMetadata"> | number
    contentId?: StringWithAggregatesFilter<"TmdbMetadata"> | string
    tmdbId?: IntNullableWithAggregatesFilter<"TmdbMetadata"> | number | null
    title?: StringWithAggregatesFilter<"TmdbMetadata"> | string
    overview?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    posterPath?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    backdropPath?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    rating?: FloatNullableWithAggregatesFilter<"TmdbMetadata"> | number | null
    ageRating?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    releaseDate?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    genres?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    cast?: StringNullableWithAggregatesFilter<"TmdbMetadata"> | string | null
    updatedAt?: DateTimeWithAggregatesFilter<"TmdbMetadata"> | Date | string
  }

  export type UserCreateInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserCreateNestedManyWithoutUserInput
    licenses?: LicenseCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    profiles?: ProfileCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserUncheckedCreateNestedManyWithoutUserInput
    licenses?: LicenseUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    profiles?: ProfileUncheckedCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUpdateManyWithoutUserNestedInput
    licenses?: LicenseUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    profiles?: ProfileUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUncheckedUpdateManyWithoutUserNestedInput
    licenses?: LicenseUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    profiles?: ProfileUncheckedUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateManyInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type UserUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type UserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DeviceUserCreateInput = {
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    user?: UserCreateNestedOneWithoutDevicesInput
    licenses?: LicenseCreateNestedManyWithoutDeviceUserInput
  }

  export type DeviceUserUncheckedCreateInput = {
    id?: number
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    userId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    licenses?: LicenseUncheckedCreateNestedManyWithoutDeviceUserInput
  }

  export type DeviceUserUpdateInput = {
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutDevicesNestedInput
    licenses?: LicenseUpdateManyWithoutDeviceUserNestedInput
  }

  export type DeviceUserUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    licenses?: LicenseUncheckedUpdateManyWithoutDeviceUserNestedInput
  }

  export type DeviceUserCreateManyInput = {
    id?: number
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    userId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type DeviceUserUpdateManyMutationInput = {
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type DeviceUserUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type XtreamServerCreateInput = {
    name: string
    url: string
    serverIdentity: string
    isActive?: boolean
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    licenses?: LicenseCreateNestedManyWithoutServerInput
  }

  export type XtreamServerUncheckedCreateInput = {
    id?: number
    name: string
    url: string
    serverIdentity: string
    isActive?: boolean
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
    licenses?: LicenseUncheckedCreateNestedManyWithoutServerInput
  }

  export type XtreamServerUpdateInput = {
    name?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    serverIdentity?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    licenses?: LicenseUpdateManyWithoutServerNestedInput
  }

  export type XtreamServerUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    serverIdentity?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    licenses?: LicenseUncheckedUpdateManyWithoutServerNestedInput
  }

  export type XtreamServerCreateManyInput = {
    id?: number
    name: string
    url: string
    serverIdentity: string
    isActive?: boolean
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type XtreamServerUpdateManyMutationInput = {
    name?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    serverIdentity?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type XtreamServerUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    serverIdentity?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LicenseCreateInput = {
    key: string
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    user?: UserCreateNestedOneWithoutLicensesInput
    deviceUser?: DeviceUserCreateNestedOneWithoutLicensesInput
    server?: XtreamServerCreateNestedOneWithoutLicensesInput
  }

  export type LicenseUncheckedCreateInput = {
    id?: number
    key: string
    userId?: number | null
    deviceUserId?: number | null
    serverId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseUpdateInput = {
    key?: StringFieldUpdateOperationsInput | string
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutLicensesNestedInput
    deviceUser?: DeviceUserUpdateOneWithoutLicensesNestedInput
    server?: XtreamServerUpdateOneWithoutLicensesNestedInput
  }

  export type LicenseUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    deviceUserId?: NullableIntFieldUpdateOperationsInput | number | null
    serverId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseCreateManyInput = {
    id?: number
    key: string
    userId?: number | null
    deviceUserId?: number | null
    serverId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseUpdateManyMutationInput = {
    key?: StringFieldUpdateOperationsInput | string
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    deviceUserId?: NullableIntFieldUpdateOperationsInput | number | null
    serverId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AuditLogCreateInput = {
    action: $Enums.AuditAction
    entity: string
    entityId?: number | null
    details?: string | null
    ipAddress?: string | null
    createdAt?: Date | string
    user?: UserCreateNestedOneWithoutAuditLogsInput
  }

  export type AuditLogUncheckedCreateInput = {
    id?: number
    userId?: number | null
    action: $Enums.AuditAction
    entity: string
    entityId?: number | null
    details?: string | null
    ipAddress?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateInput = {
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneWithoutAuditLogsNestedInput
  }

  export type AuditLogUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogCreateManyInput = {
    id?: number
    userId?: number | null
    action: $Enums.AuditAction
    entity: string
    entityId?: number | null
    details?: string | null
    ipAddress?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUpdateManyMutationInput = {
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateInput = {
    refreshToken: string
    expiresAt: Date | string
    createdAt?: Date | string
    user: UserCreateNestedOneWithoutSessionsInput
  }

  export type SessionUncheckedCreateInput = {
    id?: number
    userId: number
    refreshToken: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUpdateInput = {
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutSessionsNestedInput
  }

  export type SessionUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionCreateManyInput = {
    id?: number
    userId: number
    refreshToken: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUpdateManyMutationInput = {
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceTokenCreateInput = {
    token: string
    settingsCode: string
    deviceId: string
    mac: string
    isUsed?: boolean
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type DeviceTokenUncheckedCreateInput = {
    id?: number
    token: string
    settingsCode: string
    deviceId: string
    mac: string
    isUsed?: boolean
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type DeviceTokenUpdateInput = {
    token?: StringFieldUpdateOperationsInput | string
    settingsCode?: StringFieldUpdateOperationsInput | string
    deviceId?: StringFieldUpdateOperationsInput | string
    mac?: StringFieldUpdateOperationsInput | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceTokenUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    token?: StringFieldUpdateOperationsInput | string
    settingsCode?: StringFieldUpdateOperationsInput | string
    deviceId?: StringFieldUpdateOperationsInput | string
    mac?: StringFieldUpdateOperationsInput | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceTokenCreateManyInput = {
    id?: number
    token: string
    settingsCode: string
    deviceId: string
    mac: string
    isUsed?: boolean
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type DeviceTokenUpdateManyMutationInput = {
    token?: StringFieldUpdateOperationsInput | string
    settingsCode?: StringFieldUpdateOperationsInput | string
    deviceId?: StringFieldUpdateOperationsInput | string
    mac?: StringFieldUpdateOperationsInput | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceTokenUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    token?: StringFieldUpdateOperationsInput | string
    settingsCode?: StringFieldUpdateOperationsInput | string
    deviceId?: StringFieldUpdateOperationsInput | string
    mac?: StringFieldUpdateOperationsInput | string
    isUsed?: BoolFieldUpdateOperationsInput | boolean
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceBlacklistCreateInput = {
    deviceId?: string | null
    mac?: string | null
    reason: $Enums.BlacklistReason
    details?: string | null
    createdAt?: Date | string
  }

  export type DeviceBlacklistUncheckedCreateInput = {
    id?: number
    deviceId?: string | null
    mac?: string | null
    reason: $Enums.BlacklistReason
    details?: string | null
    createdAt?: Date | string
  }

  export type DeviceBlacklistUpdateInput = {
    deviceId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: EnumBlacklistReasonFieldUpdateOperationsInput | $Enums.BlacklistReason
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceBlacklistUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: EnumBlacklistReasonFieldUpdateOperationsInput | $Enums.BlacklistReason
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceBlacklistCreateManyInput = {
    id?: number
    deviceId?: string | null
    mac?: string | null
    reason: $Enums.BlacklistReason
    details?: string | null
    createdAt?: Date | string
  }

  export type DeviceBlacklistUpdateManyMutationInput = {
    deviceId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: EnumBlacklistReasonFieldUpdateOperationsInput | $Enums.BlacklistReason
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type DeviceBlacklistUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    reason?: EnumBlacklistReasonFieldUpdateOperationsInput | $Enums.BlacklistReason
    details?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaybackActivityCreateInput = {
    movieId: string
    type: string
    profileId?: string | null
    status: string
    timestamp?: Date | string
  }

  export type PlaybackActivityUncheckedCreateInput = {
    id?: number
    movieId: string
    type: string
    profileId?: string | null
    status: string
    timestamp?: Date | string
  }

  export type PlaybackActivityUpdateInput = {
    movieId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    profileId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaybackActivityUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    movieId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    profileId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaybackActivityCreateManyInput = {
    id?: number
    movieId: string
    type: string
    profileId?: string | null
    status: string
    timestamp?: Date | string
  }

  export type PlaybackActivityUpdateManyMutationInput = {
    movieId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    profileId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type PlaybackActivityUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    movieId?: StringFieldUpdateOperationsInput | string
    type?: StringFieldUpdateOperationsInput | string
    profileId?: NullableStringFieldUpdateOperationsInput | string | null
    status?: StringFieldUpdateOperationsInput | string
    timestamp?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeProgressCreateInput = {
    profileId: string
    contentId: string
    progressMs: number
    durationMs: number
    lastUpdated?: Date | string
  }

  export type ResumeProgressUncheckedCreateInput = {
    id?: number
    profileId: string
    contentId: string
    progressMs: number
    durationMs: number
    lastUpdated?: Date | string
  }

  export type ResumeProgressUpdateInput = {
    profileId?: StringFieldUpdateOperationsInput | string
    contentId?: StringFieldUpdateOperationsInput | string
    progressMs?: IntFieldUpdateOperationsInput | number
    durationMs?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeProgressUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    profileId?: StringFieldUpdateOperationsInput | string
    contentId?: StringFieldUpdateOperationsInput | string
    progressMs?: IntFieldUpdateOperationsInput | number
    durationMs?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeProgressCreateManyInput = {
    id?: number
    profileId: string
    contentId: string
    progressMs: number
    durationMs: number
    lastUpdated?: Date | string
  }

  export type ResumeProgressUpdateManyMutationInput = {
    profileId?: StringFieldUpdateOperationsInput | string
    contentId?: StringFieldUpdateOperationsInput | string
    progressMs?: IntFieldUpdateOperationsInput | number
    durationMs?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ResumeProgressUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    profileId?: StringFieldUpdateOperationsInput | string
    contentId?: StringFieldUpdateOperationsInput | string
    progressMs?: IntFieldUpdateOperationsInput | number
    durationMs?: IntFieldUpdateOperationsInput | number
    lastUpdated?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ParentalConfigCreateInput = {
    pin?: string
    lockedCategories: string
    isPinEnabled?: boolean
    user: UserCreateNestedOneWithoutParentalConfigInput
  }

  export type ParentalConfigUncheckedCreateInput = {
    id?: number
    userId: number
    pin?: string
    lockedCategories: string
    isPinEnabled?: boolean
  }

  export type ParentalConfigUpdateInput = {
    pin?: StringFieldUpdateOperationsInput | string
    lockedCategories?: StringFieldUpdateOperationsInput | string
    isPinEnabled?: BoolFieldUpdateOperationsInput | boolean
    user?: UserUpdateOneRequiredWithoutParentalConfigNestedInput
  }

  export type ParentalConfigUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    pin?: StringFieldUpdateOperationsInput | string
    lockedCategories?: StringFieldUpdateOperationsInput | string
    isPinEnabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ParentalConfigCreateManyInput = {
    id?: number
    userId: number
    pin?: string
    lockedCategories: string
    isPinEnabled?: boolean
  }

  export type ParentalConfigUpdateManyMutationInput = {
    pin?: StringFieldUpdateOperationsInput | string
    lockedCategories?: StringFieldUpdateOperationsInput | string
    isPinEnabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ParentalConfigUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    userId?: IntFieldUpdateOperationsInput | number
    pin?: StringFieldUpdateOperationsInput | string
    lockedCategories?: StringFieldUpdateOperationsInput | string
    isPinEnabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ThemeConfigCreateInput = {
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    logoUrl?: string | null
    backgroundUrl?: string | null
    isLive?: boolean
    updatedAt?: Date | string
  }

  export type ThemeConfigUncheckedCreateInput = {
    id?: number
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    logoUrl?: string | null
    backgroundUrl?: string | null
    isLive?: boolean
    updatedAt?: Date | string
  }

  export type ThemeConfigUpdateInput = {
    primaryColor?: StringFieldUpdateOperationsInput | string
    secondaryColor?: StringFieldUpdateOperationsInput | string
    accentColor?: StringFieldUpdateOperationsInput | string
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    backgroundUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isLive?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ThemeConfigUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    primaryColor?: StringFieldUpdateOperationsInput | string
    secondaryColor?: StringFieldUpdateOperationsInput | string
    accentColor?: StringFieldUpdateOperationsInput | string
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    backgroundUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isLive?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ThemeConfigCreateManyInput = {
    id?: number
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    logoUrl?: string | null
    backgroundUrl?: string | null
    isLive?: boolean
    updatedAt?: Date | string
  }

  export type ThemeConfigUpdateManyMutationInput = {
    primaryColor?: StringFieldUpdateOperationsInput | string
    secondaryColor?: StringFieldUpdateOperationsInput | string
    accentColor?: StringFieldUpdateOperationsInput | string
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    backgroundUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isLive?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ThemeConfigUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    primaryColor?: StringFieldUpdateOperationsInput | string
    secondaryColor?: StringFieldUpdateOperationsInput | string
    accentColor?: StringFieldUpdateOperationsInput | string
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    backgroundUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isLive?: BoolFieldUpdateOperationsInput | boolean
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileCreateInput = {
    id?: string
    name: string
    avatarUrl?: string | null
    isKids?: boolean
    pin?: string | null
    lastUsed?: Date | string
    user: UserCreateNestedOneWithoutProfilesInput
  }

  export type ProfileUncheckedCreateInput = {
    id?: string
    userId: number
    name: string
    avatarUrl?: string | null
    isKids?: boolean
    pin?: string | null
    lastUsed?: Date | string
  }

  export type ProfileUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
    user?: UserUpdateOneRequiredWithoutProfilesNestedInput
  }

  export type ProfileUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileCreateManyInput = {
    id?: string
    userId: number
    name: string
    avatarUrl?: string | null
    isKids?: boolean
    pin?: string | null
    lastUsed?: Date | string
  }

  export type ProfileUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    userId?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TmdbMetadataCreateInput = {
    contentId: string
    tmdbId?: number | null
    title: string
    overview?: string | null
    posterPath?: string | null
    backdropPath?: string | null
    rating?: number | null
    ageRating?: string | null
    releaseDate?: string | null
    genres?: string | null
    cast?: string | null
    updatedAt?: Date | string
  }

  export type TmdbMetadataUncheckedCreateInput = {
    id?: number
    contentId: string
    tmdbId?: number | null
    title: string
    overview?: string | null
    posterPath?: string | null
    backdropPath?: string | null
    rating?: number | null
    ageRating?: string | null
    releaseDate?: string | null
    genres?: string | null
    cast?: string | null
    updatedAt?: Date | string
  }

  export type TmdbMetadataUpdateInput = {
    contentId?: StringFieldUpdateOperationsInput | string
    tmdbId?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    overview?: NullableStringFieldUpdateOperationsInput | string | null
    posterPath?: NullableStringFieldUpdateOperationsInput | string | null
    backdropPath?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    ageRating?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableStringFieldUpdateOperationsInput | string | null
    genres?: NullableStringFieldUpdateOperationsInput | string | null
    cast?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TmdbMetadataUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    contentId?: StringFieldUpdateOperationsInput | string
    tmdbId?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    overview?: NullableStringFieldUpdateOperationsInput | string | null
    posterPath?: NullableStringFieldUpdateOperationsInput | string | null
    backdropPath?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    ageRating?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableStringFieldUpdateOperationsInput | string | null
    genres?: NullableStringFieldUpdateOperationsInput | string | null
    cast?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TmdbMetadataCreateManyInput = {
    id?: number
    contentId: string
    tmdbId?: number | null
    title: string
    overview?: string | null
    posterPath?: string | null
    backdropPath?: string | null
    rating?: number | null
    ageRating?: string | null
    releaseDate?: string | null
    genres?: string | null
    cast?: string | null
    updatedAt?: Date | string
  }

  export type TmdbMetadataUpdateManyMutationInput = {
    contentId?: StringFieldUpdateOperationsInput | string
    tmdbId?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    overview?: NullableStringFieldUpdateOperationsInput | string | null
    posterPath?: NullableStringFieldUpdateOperationsInput | string | null
    backdropPath?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    ageRating?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableStringFieldUpdateOperationsInput | string | null
    genres?: NullableStringFieldUpdateOperationsInput | string | null
    cast?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type TmdbMetadataUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    contentId?: StringFieldUpdateOperationsInput | string
    tmdbId?: NullableIntFieldUpdateOperationsInput | number | null
    title?: StringFieldUpdateOperationsInput | string
    overview?: NullableStringFieldUpdateOperationsInput | string | null
    posterPath?: NullableStringFieldUpdateOperationsInput | string | null
    backdropPath?: NullableStringFieldUpdateOperationsInput | string | null
    rating?: NullableFloatFieldUpdateOperationsInput | number | null
    ageRating?: NullableStringFieldUpdateOperationsInput | string | null
    releaseDate?: NullableStringFieldUpdateOperationsInput | string | null
    genres?: NullableStringFieldUpdateOperationsInput | string | null
    cast?: NullableStringFieldUpdateOperationsInput | string | null
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[]
    notIn?: $Enums.UserRole[]
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type EnumAuthProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.AuthProvider | EnumAuthProviderFieldRefInput<$PrismaModel>
    in?: $Enums.AuthProvider[]
    notIn?: $Enums.AuthProvider[]
    not?: NestedEnumAuthProviderFilter<$PrismaModel> | $Enums.AuthProvider
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type DeviceUserListRelationFilter = {
    every?: DeviceUserWhereInput
    some?: DeviceUserWhereInput
    none?: DeviceUserWhereInput
  }

  export type LicenseListRelationFilter = {
    every?: LicenseWhereInput
    some?: LicenseWhereInput
    none?: LicenseWhereInput
  }

  export type AuditLogListRelationFilter = {
    every?: AuditLogWhereInput
    some?: AuditLogWhereInput
    none?: AuditLogWhereInput
  }

  export type SessionListRelationFilter = {
    every?: SessionWhereInput
    some?: SessionWhereInput
    none?: SessionWhereInput
  }

  export type ProfileListRelationFilter = {
    every?: ProfileWhereInput
    some?: ProfileWhereInput
    none?: ProfileWhereInput
  }

  export type ParentalConfigNullableScalarRelationFilter = {
    is?: ParentalConfigWhereInput | null
    isNot?: ParentalConfigWhereInput | null
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type DeviceUserOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type LicenseOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AuditLogOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SessionOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type ProfileOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserOrderByRelevanceInput = {
    fields: UserOrderByRelevanceFieldEnum | UserOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    authProvider?: SortOrder
    lastLoginAt?: SortOrder
    lastLoginIp?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UserAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    authProvider?: SortOrder
    lastLoginAt?: SortOrder
    lastLoginIp?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    email?: SortOrder
    password?: SortOrder
    role?: SortOrder
    isActive?: SortOrder
    authProvider?: SortOrder
    lastLoginAt?: SortOrder
    lastLoginIp?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type UserSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[]
    notIn?: $Enums.UserRole[]
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type EnumAuthProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuthProvider | EnumAuthProviderFieldRefInput<$PrismaModel>
    in?: $Enums.AuthProvider[]
    notIn?: $Enums.AuthProvider[]
    not?: NestedEnumAuthProviderWithAggregatesFilter<$PrismaModel> | $Enums.AuthProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuthProviderFilter<$PrismaModel>
    _max?: NestedEnumAuthProviderFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type EnumPlatformNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.Platform | EnumPlatformFieldRefInput<$PrismaModel> | null
    in?: $Enums.Platform[] | null
    notIn?: $Enums.Platform[] | null
    not?: NestedEnumPlatformNullableFilter<$PrismaModel> | $Enums.Platform | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type DeviceUserOrderByRelevanceInput = {
    fields: DeviceUserOrderByRelevanceFieldEnum | DeviceUserOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type DeviceUserCountOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    softwareId?: SortOrder
    mac?: SortOrder
    brand?: SortOrder
    model?: SortOrder
    serial?: SortOrder
    platform?: SortOrder
    publicIp?: SortOrder
    appVersion?: SortOrder
    osVersion?: SortOrder
    lastSeenAt?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type DeviceUserAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type DeviceUserMaxOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    softwareId?: SortOrder
    mac?: SortOrder
    brand?: SortOrder
    model?: SortOrder
    serial?: SortOrder
    platform?: SortOrder
    publicIp?: SortOrder
    appVersion?: SortOrder
    osVersion?: SortOrder
    lastSeenAt?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type DeviceUserMinOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    softwareId?: SortOrder
    mac?: SortOrder
    brand?: SortOrder
    model?: SortOrder
    serial?: SortOrder
    platform?: SortOrder
    publicIp?: SortOrder
    appVersion?: SortOrder
    osVersion?: SortOrder
    lastSeenAt?: SortOrder
    userId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type DeviceUserSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type EnumPlatformNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Platform | EnumPlatformFieldRefInput<$PrismaModel> | null
    in?: $Enums.Platform[] | null
    notIn?: $Enums.Platform[] | null
    not?: NestedEnumPlatformNullableWithAggregatesFilter<$PrismaModel> | $Enums.Platform | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPlatformNullableFilter<$PrismaModel>
    _max?: NestedEnumPlatformNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type XtreamServerOrderByRelevanceInput = {
    fields: XtreamServerOrderByRelevanceFieldEnum | XtreamServerOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type XtreamServerCountOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    url?: SortOrder
    serverIdentity?: SortOrder
    isActive?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type XtreamServerAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type XtreamServerMaxOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    url?: SortOrder
    serverIdentity?: SortOrder
    isActive?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type XtreamServerMinOrderByAggregateInput = {
    id?: SortOrder
    name?: SortOrder
    url?: SortOrder
    serverIdentity?: SortOrder
    isActive?: SortOrder
    isDefault?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type XtreamServerSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumLicensePlanFilter<$PrismaModel = never> = {
    equals?: $Enums.LicensePlan | EnumLicensePlanFieldRefInput<$PrismaModel>
    in?: $Enums.LicensePlan[]
    notIn?: $Enums.LicensePlan[]
    not?: NestedEnumLicensePlanFilter<$PrismaModel> | $Enums.LicensePlan
  }

  export type EnumLicenseStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.LicenseStatus | EnumLicenseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LicenseStatus[]
    notIn?: $Enums.LicenseStatus[]
    not?: NestedEnumLicenseStatusFilter<$PrismaModel> | $Enums.LicenseStatus
  }

  export type DeviceUserNullableScalarRelationFilter = {
    is?: DeviceUserWhereInput | null
    isNot?: DeviceUserWhereInput | null
  }

  export type XtreamServerNullableScalarRelationFilter = {
    is?: XtreamServerWhereInput | null
    isNot?: XtreamServerWhereInput | null
  }

  export type LicenseOrderByRelevanceInput = {
    fields: LicenseOrderByRelevanceFieldEnum | LicenseOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type LicenseCountOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    userId?: SortOrder
    deviceUserId?: SortOrder
    serverId?: SortOrder
    xtreamUser?: SortOrder
    xtreamPass?: SortOrder
    plan?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    activatedAt?: SortOrder
    lastUsedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type LicenseAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    deviceUserId?: SortOrder
    serverId?: SortOrder
  }

  export type LicenseMaxOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    userId?: SortOrder
    deviceUserId?: SortOrder
    serverId?: SortOrder
    xtreamUser?: SortOrder
    xtreamPass?: SortOrder
    plan?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    activatedAt?: SortOrder
    lastUsedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type LicenseMinOrderByAggregateInput = {
    id?: SortOrder
    key?: SortOrder
    userId?: SortOrder
    deviceUserId?: SortOrder
    serverId?: SortOrder
    xtreamUser?: SortOrder
    xtreamPass?: SortOrder
    plan?: SortOrder
    status?: SortOrder
    expiresAt?: SortOrder
    activatedAt?: SortOrder
    lastUsedAt?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    deletedAt?: SortOrder
  }

  export type LicenseSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    deviceUserId?: SortOrder
    serverId?: SortOrder
  }

  export type EnumLicensePlanWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LicensePlan | EnumLicensePlanFieldRefInput<$PrismaModel>
    in?: $Enums.LicensePlan[]
    notIn?: $Enums.LicensePlan[]
    not?: NestedEnumLicensePlanWithAggregatesFilter<$PrismaModel> | $Enums.LicensePlan
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLicensePlanFilter<$PrismaModel>
    _max?: NestedEnumLicensePlanFilter<$PrismaModel>
  }

  export type EnumLicenseStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LicenseStatus | EnumLicenseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LicenseStatus[]
    notIn?: $Enums.LicenseStatus[]
    not?: NestedEnumLicenseStatusWithAggregatesFilter<$PrismaModel> | $Enums.LicenseStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLicenseStatusFilter<$PrismaModel>
    _max?: NestedEnumLicenseStatusFilter<$PrismaModel>
  }

  export type EnumAuditActionFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[]
    notIn?: $Enums.AuditAction[]
    not?: NestedEnumAuditActionFilter<$PrismaModel> | $Enums.AuditAction
  }

  export type AuditLogOrderByRelevanceInput = {
    fields: AuditLogOrderByRelevanceFieldEnum | AuditLogOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type AuditLogCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    details?: SortOrder
    ipAddress?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    entityId?: SortOrder
  }

  export type AuditLogMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    details?: SortOrder
    ipAddress?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    action?: SortOrder
    entity?: SortOrder
    entityId?: SortOrder
    details?: SortOrder
    ipAddress?: SortOrder
    createdAt?: SortOrder
  }

  export type AuditLogSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    entityId?: SortOrder
  }

  export type EnumAuditActionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[]
    notIn?: $Enums.AuditAction[]
    not?: NestedEnumAuditActionWithAggregatesFilter<$PrismaModel> | $Enums.AuditAction
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditActionFilter<$PrismaModel>
    _max?: NestedEnumAuditActionFilter<$PrismaModel>
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type SessionOrderByRelevanceInput = {
    fields: SessionOrderByRelevanceFieldEnum | SessionOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type SessionCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type SessionMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    refreshToken?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type SessionSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type DeviceTokenOrderByRelevanceInput = {
    fields: DeviceTokenOrderByRelevanceFieldEnum | DeviceTokenOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type DeviceTokenCountOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    settingsCode?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    isUsed?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type DeviceTokenAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DeviceTokenMaxOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    settingsCode?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    isUsed?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type DeviceTokenMinOrderByAggregateInput = {
    id?: SortOrder
    token?: SortOrder
    settingsCode?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    isUsed?: SortOrder
    expiresAt?: SortOrder
    createdAt?: SortOrder
  }

  export type DeviceTokenSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumBlacklistReasonFilter<$PrismaModel = never> = {
    equals?: $Enums.BlacklistReason | EnumBlacklistReasonFieldRefInput<$PrismaModel>
    in?: $Enums.BlacklistReason[]
    notIn?: $Enums.BlacklistReason[]
    not?: NestedEnumBlacklistReasonFilter<$PrismaModel> | $Enums.BlacklistReason
  }

  export type DeviceBlacklistOrderByRelevanceInput = {
    fields: DeviceBlacklistOrderByRelevanceFieldEnum | DeviceBlacklistOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type DeviceBlacklistCountOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    reason?: SortOrder
    details?: SortOrder
    createdAt?: SortOrder
  }

  export type DeviceBlacklistAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DeviceBlacklistMaxOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    reason?: SortOrder
    details?: SortOrder
    createdAt?: SortOrder
  }

  export type DeviceBlacklistMinOrderByAggregateInput = {
    id?: SortOrder
    deviceId?: SortOrder
    mac?: SortOrder
    reason?: SortOrder
    details?: SortOrder
    createdAt?: SortOrder
  }

  export type DeviceBlacklistSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type EnumBlacklistReasonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BlacklistReason | EnumBlacklistReasonFieldRefInput<$PrismaModel>
    in?: $Enums.BlacklistReason[]
    notIn?: $Enums.BlacklistReason[]
    not?: NestedEnumBlacklistReasonWithAggregatesFilter<$PrismaModel> | $Enums.BlacklistReason
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBlacklistReasonFilter<$PrismaModel>
    _max?: NestedEnumBlacklistReasonFilter<$PrismaModel>
  }

  export type PlaybackActivityOrderByRelevanceInput = {
    fields: PlaybackActivityOrderByRelevanceFieldEnum | PlaybackActivityOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type PlaybackActivityCountOrderByAggregateInput = {
    id?: SortOrder
    movieId?: SortOrder
    type?: SortOrder
    profileId?: SortOrder
    status?: SortOrder
    timestamp?: SortOrder
  }

  export type PlaybackActivityAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type PlaybackActivityMaxOrderByAggregateInput = {
    id?: SortOrder
    movieId?: SortOrder
    type?: SortOrder
    profileId?: SortOrder
    status?: SortOrder
    timestamp?: SortOrder
  }

  export type PlaybackActivityMinOrderByAggregateInput = {
    id?: SortOrder
    movieId?: SortOrder
    type?: SortOrder
    profileId?: SortOrder
    status?: SortOrder
    timestamp?: SortOrder
  }

  export type PlaybackActivitySumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ResumeProgressOrderByRelevanceInput = {
    fields: ResumeProgressOrderByRelevanceFieldEnum | ResumeProgressOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ResumeProgressProfileIdContentIdCompoundUniqueInput = {
    profileId: string
    contentId: string
  }

  export type ResumeProgressCountOrderByAggregateInput = {
    id?: SortOrder
    profileId?: SortOrder
    contentId?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
    lastUpdated?: SortOrder
  }

  export type ResumeProgressAvgOrderByAggregateInput = {
    id?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
  }

  export type ResumeProgressMaxOrderByAggregateInput = {
    id?: SortOrder
    profileId?: SortOrder
    contentId?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
    lastUpdated?: SortOrder
  }

  export type ResumeProgressMinOrderByAggregateInput = {
    id?: SortOrder
    profileId?: SortOrder
    contentId?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
    lastUpdated?: SortOrder
  }

  export type ResumeProgressSumOrderByAggregateInput = {
    id?: SortOrder
    progressMs?: SortOrder
    durationMs?: SortOrder
  }

  export type ParentalConfigOrderByRelevanceInput = {
    fields: ParentalConfigOrderByRelevanceFieldEnum | ParentalConfigOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ParentalConfigCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    pin?: SortOrder
    lockedCategories?: SortOrder
    isPinEnabled?: SortOrder
  }

  export type ParentalConfigAvgOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type ParentalConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    pin?: SortOrder
    lockedCategories?: SortOrder
    isPinEnabled?: SortOrder
  }

  export type ParentalConfigMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    pin?: SortOrder
    lockedCategories?: SortOrder
    isPinEnabled?: SortOrder
  }

  export type ParentalConfigSumOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
  }

  export type ThemeConfigOrderByRelevanceInput = {
    fields: ThemeConfigOrderByRelevanceFieldEnum | ThemeConfigOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ThemeConfigCountOrderByAggregateInput = {
    id?: SortOrder
    primaryColor?: SortOrder
    secondaryColor?: SortOrder
    accentColor?: SortOrder
    logoUrl?: SortOrder
    backgroundUrl?: SortOrder
    isLive?: SortOrder
    updatedAt?: SortOrder
  }

  export type ThemeConfigAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ThemeConfigMaxOrderByAggregateInput = {
    id?: SortOrder
    primaryColor?: SortOrder
    secondaryColor?: SortOrder
    accentColor?: SortOrder
    logoUrl?: SortOrder
    backgroundUrl?: SortOrder
    isLive?: SortOrder
    updatedAt?: SortOrder
  }

  export type ThemeConfigMinOrderByAggregateInput = {
    id?: SortOrder
    primaryColor?: SortOrder
    secondaryColor?: SortOrder
    accentColor?: SortOrder
    logoUrl?: SortOrder
    backgroundUrl?: SortOrder
    isLive?: SortOrder
    updatedAt?: SortOrder
  }

  export type ThemeConfigSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type ProfileOrderByRelevanceInput = {
    fields: ProfileOrderByRelevanceFieldEnum | ProfileOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type ProfileCountOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrder
    isKids?: SortOrder
    pin?: SortOrder
    lastUsed?: SortOrder
  }

  export type ProfileAvgOrderByAggregateInput = {
    userId?: SortOrder
  }

  export type ProfileMaxOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrder
    isKids?: SortOrder
    pin?: SortOrder
    lastUsed?: SortOrder
  }

  export type ProfileMinOrderByAggregateInput = {
    id?: SortOrder
    userId?: SortOrder
    name?: SortOrder
    avatarUrl?: SortOrder
    isKids?: SortOrder
    pin?: SortOrder
    lastUsed?: SortOrder
  }

  export type ProfileSumOrderByAggregateInput = {
    userId?: SortOrder
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type TmdbMetadataOrderByRelevanceInput = {
    fields: TmdbMetadataOrderByRelevanceFieldEnum | TmdbMetadataOrderByRelevanceFieldEnum[]
    sort: SortOrder
    search: string
  }

  export type TmdbMetadataCountOrderByAggregateInput = {
    id?: SortOrder
    contentId?: SortOrder
    tmdbId?: SortOrder
    title?: SortOrder
    overview?: SortOrder
    posterPath?: SortOrder
    backdropPath?: SortOrder
    rating?: SortOrder
    ageRating?: SortOrder
    releaseDate?: SortOrder
    genres?: SortOrder
    cast?: SortOrder
    updatedAt?: SortOrder
  }

  export type TmdbMetadataAvgOrderByAggregateInput = {
    id?: SortOrder
    tmdbId?: SortOrder
    rating?: SortOrder
  }

  export type TmdbMetadataMaxOrderByAggregateInput = {
    id?: SortOrder
    contentId?: SortOrder
    tmdbId?: SortOrder
    title?: SortOrder
    overview?: SortOrder
    posterPath?: SortOrder
    backdropPath?: SortOrder
    rating?: SortOrder
    ageRating?: SortOrder
    releaseDate?: SortOrder
    genres?: SortOrder
    cast?: SortOrder
    updatedAt?: SortOrder
  }

  export type TmdbMetadataMinOrderByAggregateInput = {
    id?: SortOrder
    contentId?: SortOrder
    tmdbId?: SortOrder
    title?: SortOrder
    overview?: SortOrder
    posterPath?: SortOrder
    backdropPath?: SortOrder
    rating?: SortOrder
    ageRating?: SortOrder
    releaseDate?: SortOrder
    genres?: SortOrder
    cast?: SortOrder
    updatedAt?: SortOrder
  }

  export type TmdbMetadataSumOrderByAggregateInput = {
    id?: SortOrder
    tmdbId?: SortOrder
    rating?: SortOrder
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type DeviceUserCreateNestedManyWithoutUserInput = {
    create?: XOR<DeviceUserCreateWithoutUserInput, DeviceUserUncheckedCreateWithoutUserInput> | DeviceUserCreateWithoutUserInput[] | DeviceUserUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DeviceUserCreateOrConnectWithoutUserInput | DeviceUserCreateOrConnectWithoutUserInput[]
    createMany?: DeviceUserCreateManyUserInputEnvelope
    connect?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
  }

  export type LicenseCreateNestedManyWithoutUserInput = {
    create?: XOR<LicenseCreateWithoutUserInput, LicenseUncheckedCreateWithoutUserInput> | LicenseCreateWithoutUserInput[] | LicenseUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutUserInput | LicenseCreateOrConnectWithoutUserInput[]
    createMany?: LicenseCreateManyUserInputEnvelope
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
  }

  export type AuditLogCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type SessionCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type ProfileCreateNestedManyWithoutUserInput = {
    create?: XOR<ProfileCreateWithoutUserInput, ProfileUncheckedCreateWithoutUserInput> | ProfileCreateWithoutUserInput[] | ProfileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProfileCreateOrConnectWithoutUserInput | ProfileCreateOrConnectWithoutUserInput[]
    createMany?: ProfileCreateManyUserInputEnvelope
    connect?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
  }

  export type ParentalConfigCreateNestedOneWithoutUserInput = {
    create?: XOR<ParentalConfigCreateWithoutUserInput, ParentalConfigUncheckedCreateWithoutUserInput>
    connectOrCreate?: ParentalConfigCreateOrConnectWithoutUserInput
    connect?: ParentalConfigWhereUniqueInput
  }

  export type DeviceUserUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<DeviceUserCreateWithoutUserInput, DeviceUserUncheckedCreateWithoutUserInput> | DeviceUserCreateWithoutUserInput[] | DeviceUserUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DeviceUserCreateOrConnectWithoutUserInput | DeviceUserCreateOrConnectWithoutUserInput[]
    createMany?: DeviceUserCreateManyUserInputEnvelope
    connect?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
  }

  export type LicenseUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<LicenseCreateWithoutUserInput, LicenseUncheckedCreateWithoutUserInput> | LicenseCreateWithoutUserInput[] | LicenseUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutUserInput | LicenseCreateOrConnectWithoutUserInput[]
    createMany?: LicenseCreateManyUserInputEnvelope
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
  }

  export type AuditLogUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
  }

  export type SessionUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
  }

  export type ProfileUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<ProfileCreateWithoutUserInput, ProfileUncheckedCreateWithoutUserInput> | ProfileCreateWithoutUserInput[] | ProfileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProfileCreateOrConnectWithoutUserInput | ProfileCreateOrConnectWithoutUserInput[]
    createMany?: ProfileCreateManyUserInputEnvelope
    connect?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
  }

  export type ParentalConfigUncheckedCreateNestedOneWithoutUserInput = {
    create?: XOR<ParentalConfigCreateWithoutUserInput, ParentalConfigUncheckedCreateWithoutUserInput>
    connectOrCreate?: ParentalConfigCreateOrConnectWithoutUserInput
    connect?: ParentalConfigWhereUniqueInput
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumUserRoleFieldUpdateOperationsInput = {
    set?: $Enums.UserRole
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type EnumAuthProviderFieldUpdateOperationsInput = {
    set?: $Enums.AuthProvider
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type DeviceUserUpdateManyWithoutUserNestedInput = {
    create?: XOR<DeviceUserCreateWithoutUserInput, DeviceUserUncheckedCreateWithoutUserInput> | DeviceUserCreateWithoutUserInput[] | DeviceUserUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DeviceUserCreateOrConnectWithoutUserInput | DeviceUserCreateOrConnectWithoutUserInput[]
    upsert?: DeviceUserUpsertWithWhereUniqueWithoutUserInput | DeviceUserUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: DeviceUserCreateManyUserInputEnvelope
    set?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    disconnect?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    delete?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    connect?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    update?: DeviceUserUpdateWithWhereUniqueWithoutUserInput | DeviceUserUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: DeviceUserUpdateManyWithWhereWithoutUserInput | DeviceUserUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: DeviceUserScalarWhereInput | DeviceUserScalarWhereInput[]
  }

  export type LicenseUpdateManyWithoutUserNestedInput = {
    create?: XOR<LicenseCreateWithoutUserInput, LicenseUncheckedCreateWithoutUserInput> | LicenseCreateWithoutUserInput[] | LicenseUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutUserInput | LicenseCreateOrConnectWithoutUserInput[]
    upsert?: LicenseUpsertWithWhereUniqueWithoutUserInput | LicenseUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: LicenseCreateManyUserInputEnvelope
    set?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    disconnect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    delete?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    update?: LicenseUpdateWithWhereUniqueWithoutUserInput | LicenseUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: LicenseUpdateManyWithWhereWithoutUserInput | LicenseUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
  }

  export type AuditLogUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type SessionUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type ProfileUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProfileCreateWithoutUserInput, ProfileUncheckedCreateWithoutUserInput> | ProfileCreateWithoutUserInput[] | ProfileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProfileCreateOrConnectWithoutUserInput | ProfileCreateOrConnectWithoutUserInput[]
    upsert?: ProfileUpsertWithWhereUniqueWithoutUserInput | ProfileUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProfileCreateManyUserInputEnvelope
    set?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    disconnect?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    delete?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    connect?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    update?: ProfileUpdateWithWhereUniqueWithoutUserInput | ProfileUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProfileUpdateManyWithWhereWithoutUserInput | ProfileUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProfileScalarWhereInput | ProfileScalarWhereInput[]
  }

  export type ParentalConfigUpdateOneWithoutUserNestedInput = {
    create?: XOR<ParentalConfigCreateWithoutUserInput, ParentalConfigUncheckedCreateWithoutUserInput>
    connectOrCreate?: ParentalConfigCreateOrConnectWithoutUserInput
    upsert?: ParentalConfigUpsertWithoutUserInput
    disconnect?: ParentalConfigWhereInput | boolean
    delete?: ParentalConfigWhereInput | boolean
    connect?: ParentalConfigWhereUniqueInput
    update?: XOR<XOR<ParentalConfigUpdateToOneWithWhereWithoutUserInput, ParentalConfigUpdateWithoutUserInput>, ParentalConfigUncheckedUpdateWithoutUserInput>
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DeviceUserUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<DeviceUserCreateWithoutUserInput, DeviceUserUncheckedCreateWithoutUserInput> | DeviceUserCreateWithoutUserInput[] | DeviceUserUncheckedCreateWithoutUserInput[]
    connectOrCreate?: DeviceUserCreateOrConnectWithoutUserInput | DeviceUserCreateOrConnectWithoutUserInput[]
    upsert?: DeviceUserUpsertWithWhereUniqueWithoutUserInput | DeviceUserUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: DeviceUserCreateManyUserInputEnvelope
    set?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    disconnect?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    delete?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    connect?: DeviceUserWhereUniqueInput | DeviceUserWhereUniqueInput[]
    update?: DeviceUserUpdateWithWhereUniqueWithoutUserInput | DeviceUserUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: DeviceUserUpdateManyWithWhereWithoutUserInput | DeviceUserUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: DeviceUserScalarWhereInput | DeviceUserScalarWhereInput[]
  }

  export type LicenseUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<LicenseCreateWithoutUserInput, LicenseUncheckedCreateWithoutUserInput> | LicenseCreateWithoutUserInput[] | LicenseUncheckedCreateWithoutUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutUserInput | LicenseCreateOrConnectWithoutUserInput[]
    upsert?: LicenseUpsertWithWhereUniqueWithoutUserInput | LicenseUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: LicenseCreateManyUserInputEnvelope
    set?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    disconnect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    delete?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    update?: LicenseUpdateWithWhereUniqueWithoutUserInput | LicenseUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: LicenseUpdateManyWithWhereWithoutUserInput | LicenseUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
  }

  export type AuditLogUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput> | AuditLogCreateWithoutUserInput[] | AuditLogUncheckedCreateWithoutUserInput[]
    connectOrCreate?: AuditLogCreateOrConnectWithoutUserInput | AuditLogCreateOrConnectWithoutUserInput[]
    upsert?: AuditLogUpsertWithWhereUniqueWithoutUserInput | AuditLogUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: AuditLogCreateManyUserInputEnvelope
    set?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    disconnect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    delete?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    connect?: AuditLogWhereUniqueInput | AuditLogWhereUniqueInput[]
    update?: AuditLogUpdateWithWhereUniqueWithoutUserInput | AuditLogUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: AuditLogUpdateManyWithWhereWithoutUserInput | AuditLogUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
  }

  export type SessionUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput> | SessionCreateWithoutUserInput[] | SessionUncheckedCreateWithoutUserInput[]
    connectOrCreate?: SessionCreateOrConnectWithoutUserInput | SessionCreateOrConnectWithoutUserInput[]
    upsert?: SessionUpsertWithWhereUniqueWithoutUserInput | SessionUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: SessionCreateManyUserInputEnvelope
    set?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    disconnect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    delete?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    connect?: SessionWhereUniqueInput | SessionWhereUniqueInput[]
    update?: SessionUpdateWithWhereUniqueWithoutUserInput | SessionUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: SessionUpdateManyWithWhereWithoutUserInput | SessionUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: SessionScalarWhereInput | SessionScalarWhereInput[]
  }

  export type ProfileUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<ProfileCreateWithoutUserInput, ProfileUncheckedCreateWithoutUserInput> | ProfileCreateWithoutUserInput[] | ProfileUncheckedCreateWithoutUserInput[]
    connectOrCreate?: ProfileCreateOrConnectWithoutUserInput | ProfileCreateOrConnectWithoutUserInput[]
    upsert?: ProfileUpsertWithWhereUniqueWithoutUserInput | ProfileUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: ProfileCreateManyUserInputEnvelope
    set?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    disconnect?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    delete?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    connect?: ProfileWhereUniqueInput | ProfileWhereUniqueInput[]
    update?: ProfileUpdateWithWhereUniqueWithoutUserInput | ProfileUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: ProfileUpdateManyWithWhereWithoutUserInput | ProfileUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: ProfileScalarWhereInput | ProfileScalarWhereInput[]
  }

  export type ParentalConfigUncheckedUpdateOneWithoutUserNestedInput = {
    create?: XOR<ParentalConfigCreateWithoutUserInput, ParentalConfigUncheckedCreateWithoutUserInput>
    connectOrCreate?: ParentalConfigCreateOrConnectWithoutUserInput
    upsert?: ParentalConfigUpsertWithoutUserInput
    disconnect?: ParentalConfigWhereInput | boolean
    delete?: ParentalConfigWhereInput | boolean
    connect?: ParentalConfigWhereUniqueInput
    update?: XOR<XOR<ParentalConfigUpdateToOneWithWhereWithoutUserInput, ParentalConfigUpdateWithoutUserInput>, ParentalConfigUncheckedUpdateWithoutUserInput>
  }

  export type UserCreateNestedOneWithoutDevicesInput = {
    create?: XOR<UserCreateWithoutDevicesInput, UserUncheckedCreateWithoutDevicesInput>
    connectOrCreate?: UserCreateOrConnectWithoutDevicesInput
    connect?: UserWhereUniqueInput
  }

  export type LicenseCreateNestedManyWithoutDeviceUserInput = {
    create?: XOR<LicenseCreateWithoutDeviceUserInput, LicenseUncheckedCreateWithoutDeviceUserInput> | LicenseCreateWithoutDeviceUserInput[] | LicenseUncheckedCreateWithoutDeviceUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutDeviceUserInput | LicenseCreateOrConnectWithoutDeviceUserInput[]
    createMany?: LicenseCreateManyDeviceUserInputEnvelope
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
  }

  export type LicenseUncheckedCreateNestedManyWithoutDeviceUserInput = {
    create?: XOR<LicenseCreateWithoutDeviceUserInput, LicenseUncheckedCreateWithoutDeviceUserInput> | LicenseCreateWithoutDeviceUserInput[] | LicenseUncheckedCreateWithoutDeviceUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutDeviceUserInput | LicenseCreateOrConnectWithoutDeviceUserInput[]
    createMany?: LicenseCreateManyDeviceUserInputEnvelope
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
  }

  export type NullableEnumPlatformFieldUpdateOperationsInput = {
    set?: $Enums.Platform | null
  }

  export type UserUpdateOneWithoutDevicesNestedInput = {
    create?: XOR<UserCreateWithoutDevicesInput, UserUncheckedCreateWithoutDevicesInput>
    connectOrCreate?: UserCreateOrConnectWithoutDevicesInput
    upsert?: UserUpsertWithoutDevicesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutDevicesInput, UserUpdateWithoutDevicesInput>, UserUncheckedUpdateWithoutDevicesInput>
  }

  export type LicenseUpdateManyWithoutDeviceUserNestedInput = {
    create?: XOR<LicenseCreateWithoutDeviceUserInput, LicenseUncheckedCreateWithoutDeviceUserInput> | LicenseCreateWithoutDeviceUserInput[] | LicenseUncheckedCreateWithoutDeviceUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutDeviceUserInput | LicenseCreateOrConnectWithoutDeviceUserInput[]
    upsert?: LicenseUpsertWithWhereUniqueWithoutDeviceUserInput | LicenseUpsertWithWhereUniqueWithoutDeviceUserInput[]
    createMany?: LicenseCreateManyDeviceUserInputEnvelope
    set?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    disconnect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    delete?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    update?: LicenseUpdateWithWhereUniqueWithoutDeviceUserInput | LicenseUpdateWithWhereUniqueWithoutDeviceUserInput[]
    updateMany?: LicenseUpdateManyWithWhereWithoutDeviceUserInput | LicenseUpdateManyWithWhereWithoutDeviceUserInput[]
    deleteMany?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type LicenseUncheckedUpdateManyWithoutDeviceUserNestedInput = {
    create?: XOR<LicenseCreateWithoutDeviceUserInput, LicenseUncheckedCreateWithoutDeviceUserInput> | LicenseCreateWithoutDeviceUserInput[] | LicenseUncheckedCreateWithoutDeviceUserInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutDeviceUserInput | LicenseCreateOrConnectWithoutDeviceUserInput[]
    upsert?: LicenseUpsertWithWhereUniqueWithoutDeviceUserInput | LicenseUpsertWithWhereUniqueWithoutDeviceUserInput[]
    createMany?: LicenseCreateManyDeviceUserInputEnvelope
    set?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    disconnect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    delete?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    update?: LicenseUpdateWithWhereUniqueWithoutDeviceUserInput | LicenseUpdateWithWhereUniqueWithoutDeviceUserInput[]
    updateMany?: LicenseUpdateManyWithWhereWithoutDeviceUserInput | LicenseUpdateManyWithWhereWithoutDeviceUserInput[]
    deleteMany?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
  }

  export type LicenseCreateNestedManyWithoutServerInput = {
    create?: XOR<LicenseCreateWithoutServerInput, LicenseUncheckedCreateWithoutServerInput> | LicenseCreateWithoutServerInput[] | LicenseUncheckedCreateWithoutServerInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutServerInput | LicenseCreateOrConnectWithoutServerInput[]
    createMany?: LicenseCreateManyServerInputEnvelope
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
  }

  export type LicenseUncheckedCreateNestedManyWithoutServerInput = {
    create?: XOR<LicenseCreateWithoutServerInput, LicenseUncheckedCreateWithoutServerInput> | LicenseCreateWithoutServerInput[] | LicenseUncheckedCreateWithoutServerInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutServerInput | LicenseCreateOrConnectWithoutServerInput[]
    createMany?: LicenseCreateManyServerInputEnvelope
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
  }

  export type LicenseUpdateManyWithoutServerNestedInput = {
    create?: XOR<LicenseCreateWithoutServerInput, LicenseUncheckedCreateWithoutServerInput> | LicenseCreateWithoutServerInput[] | LicenseUncheckedCreateWithoutServerInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutServerInput | LicenseCreateOrConnectWithoutServerInput[]
    upsert?: LicenseUpsertWithWhereUniqueWithoutServerInput | LicenseUpsertWithWhereUniqueWithoutServerInput[]
    createMany?: LicenseCreateManyServerInputEnvelope
    set?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    disconnect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    delete?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    update?: LicenseUpdateWithWhereUniqueWithoutServerInput | LicenseUpdateWithWhereUniqueWithoutServerInput[]
    updateMany?: LicenseUpdateManyWithWhereWithoutServerInput | LicenseUpdateManyWithWhereWithoutServerInput[]
    deleteMany?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
  }

  export type LicenseUncheckedUpdateManyWithoutServerNestedInput = {
    create?: XOR<LicenseCreateWithoutServerInput, LicenseUncheckedCreateWithoutServerInput> | LicenseCreateWithoutServerInput[] | LicenseUncheckedCreateWithoutServerInput[]
    connectOrCreate?: LicenseCreateOrConnectWithoutServerInput | LicenseCreateOrConnectWithoutServerInput[]
    upsert?: LicenseUpsertWithWhereUniqueWithoutServerInput | LicenseUpsertWithWhereUniqueWithoutServerInput[]
    createMany?: LicenseCreateManyServerInputEnvelope
    set?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    disconnect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    delete?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    connect?: LicenseWhereUniqueInput | LicenseWhereUniqueInput[]
    update?: LicenseUpdateWithWhereUniqueWithoutServerInput | LicenseUpdateWithWhereUniqueWithoutServerInput[]
    updateMany?: LicenseUpdateManyWithWhereWithoutServerInput | LicenseUpdateManyWithWhereWithoutServerInput[]
    deleteMany?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutLicensesInput = {
    create?: XOR<UserCreateWithoutLicensesInput, UserUncheckedCreateWithoutLicensesInput>
    connectOrCreate?: UserCreateOrConnectWithoutLicensesInput
    connect?: UserWhereUniqueInput
  }

  export type DeviceUserCreateNestedOneWithoutLicensesInput = {
    create?: XOR<DeviceUserCreateWithoutLicensesInput, DeviceUserUncheckedCreateWithoutLicensesInput>
    connectOrCreate?: DeviceUserCreateOrConnectWithoutLicensesInput
    connect?: DeviceUserWhereUniqueInput
  }

  export type XtreamServerCreateNestedOneWithoutLicensesInput = {
    create?: XOR<XtreamServerCreateWithoutLicensesInput, XtreamServerUncheckedCreateWithoutLicensesInput>
    connectOrCreate?: XtreamServerCreateOrConnectWithoutLicensesInput
    connect?: XtreamServerWhereUniqueInput
  }

  export type EnumLicensePlanFieldUpdateOperationsInput = {
    set?: $Enums.LicensePlan
  }

  export type EnumLicenseStatusFieldUpdateOperationsInput = {
    set?: $Enums.LicenseStatus
  }

  export type UserUpdateOneWithoutLicensesNestedInput = {
    create?: XOR<UserCreateWithoutLicensesInput, UserUncheckedCreateWithoutLicensesInput>
    connectOrCreate?: UserCreateOrConnectWithoutLicensesInput
    upsert?: UserUpsertWithoutLicensesInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutLicensesInput, UserUpdateWithoutLicensesInput>, UserUncheckedUpdateWithoutLicensesInput>
  }

  export type DeviceUserUpdateOneWithoutLicensesNestedInput = {
    create?: XOR<DeviceUserCreateWithoutLicensesInput, DeviceUserUncheckedCreateWithoutLicensesInput>
    connectOrCreate?: DeviceUserCreateOrConnectWithoutLicensesInput
    upsert?: DeviceUserUpsertWithoutLicensesInput
    disconnect?: DeviceUserWhereInput | boolean
    delete?: DeviceUserWhereInput | boolean
    connect?: DeviceUserWhereUniqueInput
    update?: XOR<XOR<DeviceUserUpdateToOneWithWhereWithoutLicensesInput, DeviceUserUpdateWithoutLicensesInput>, DeviceUserUncheckedUpdateWithoutLicensesInput>
  }

  export type XtreamServerUpdateOneWithoutLicensesNestedInput = {
    create?: XOR<XtreamServerCreateWithoutLicensesInput, XtreamServerUncheckedCreateWithoutLicensesInput>
    connectOrCreate?: XtreamServerCreateOrConnectWithoutLicensesInput
    upsert?: XtreamServerUpsertWithoutLicensesInput
    disconnect?: XtreamServerWhereInput | boolean
    delete?: XtreamServerWhereInput | boolean
    connect?: XtreamServerWhereUniqueInput
    update?: XOR<XOR<XtreamServerUpdateToOneWithWhereWithoutLicensesInput, XtreamServerUpdateWithoutLicensesInput>, XtreamServerUncheckedUpdateWithoutLicensesInput>
  }

  export type UserCreateNestedOneWithoutAuditLogsInput = {
    create?: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogsInput
    connect?: UserWhereUniqueInput
  }

  export type EnumAuditActionFieldUpdateOperationsInput = {
    set?: $Enums.AuditAction
  }

  export type UserUpdateOneWithoutAuditLogsNestedInput = {
    create?: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    connectOrCreate?: UserCreateOrConnectWithoutAuditLogsInput
    upsert?: UserUpsertWithoutAuditLogsInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAuditLogsInput, UserUpdateWithoutAuditLogsInput>, UserUncheckedUpdateWithoutAuditLogsInput>
  }

  export type UserCreateNestedOneWithoutSessionsInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutSessionsNestedInput = {
    create?: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    connectOrCreate?: UserCreateOrConnectWithoutSessionsInput
    upsert?: UserUpsertWithoutSessionsInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSessionsInput, UserUpdateWithoutSessionsInput>, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type EnumBlacklistReasonFieldUpdateOperationsInput = {
    set?: $Enums.BlacklistReason
  }

  export type UserCreateNestedOneWithoutParentalConfigInput = {
    create?: XOR<UserCreateWithoutParentalConfigInput, UserUncheckedCreateWithoutParentalConfigInput>
    connectOrCreate?: UserCreateOrConnectWithoutParentalConfigInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutParentalConfigNestedInput = {
    create?: XOR<UserCreateWithoutParentalConfigInput, UserUncheckedCreateWithoutParentalConfigInput>
    connectOrCreate?: UserCreateOrConnectWithoutParentalConfigInput
    upsert?: UserUpsertWithoutParentalConfigInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutParentalConfigInput, UserUpdateWithoutParentalConfigInput>, UserUncheckedUpdateWithoutParentalConfigInput>
  }

  export type UserCreateNestedOneWithoutProfilesInput = {
    create?: XOR<UserCreateWithoutProfilesInput, UserUncheckedCreateWithoutProfilesInput>
    connectOrCreate?: UserCreateOrConnectWithoutProfilesInput
    connect?: UserWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutProfilesNestedInput = {
    create?: XOR<UserCreateWithoutProfilesInput, UserUncheckedCreateWithoutProfilesInput>
    connectOrCreate?: UserCreateOrConnectWithoutProfilesInput
    upsert?: UserUpsertWithoutProfilesInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutProfilesInput, UserUpdateWithoutProfilesInput>, UserUncheckedUpdateWithoutProfilesInput>
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumUserRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[]
    notIn?: $Enums.UserRole[]
    not?: NestedEnumUserRoleFilter<$PrismaModel> | $Enums.UserRole
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedEnumAuthProviderFilter<$PrismaModel = never> = {
    equals?: $Enums.AuthProvider | EnumAuthProviderFieldRefInput<$PrismaModel>
    in?: $Enums.AuthProvider[]
    notIn?: $Enums.AuthProvider[]
    not?: NestedEnumAuthProviderFilter<$PrismaModel> | $Enums.AuthProvider
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedEnumUserRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.UserRole | EnumUserRoleFieldRefInput<$PrismaModel>
    in?: $Enums.UserRole[]
    notIn?: $Enums.UserRole[]
    not?: NestedEnumUserRoleWithAggregatesFilter<$PrismaModel> | $Enums.UserRole
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumUserRoleFilter<$PrismaModel>
    _max?: NestedEnumUserRoleFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedEnumAuthProviderWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuthProvider | EnumAuthProviderFieldRefInput<$PrismaModel>
    in?: $Enums.AuthProvider[]
    notIn?: $Enums.AuthProvider[]
    not?: NestedEnumAuthProviderWithAggregatesFilter<$PrismaModel> | $Enums.AuthProvider
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuthProviderFilter<$PrismaModel>
    _max?: NestedEnumAuthProviderFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    search?: string
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedEnumPlatformNullableFilter<$PrismaModel = never> = {
    equals?: $Enums.Platform | EnumPlatformFieldRefInput<$PrismaModel> | null
    in?: $Enums.Platform[] | null
    notIn?: $Enums.Platform[] | null
    not?: NestedEnumPlatformNullableFilter<$PrismaModel> | $Enums.Platform | null
  }

  export type NestedEnumPlatformNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Platform | EnumPlatformFieldRefInput<$PrismaModel> | null
    in?: $Enums.Platform[] | null
    notIn?: $Enums.Platform[] | null
    not?: NestedEnumPlatformNullableWithAggregatesFilter<$PrismaModel> | $Enums.Platform | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedEnumPlatformNullableFilter<$PrismaModel>
    _max?: NestedEnumPlatformNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumLicensePlanFilter<$PrismaModel = never> = {
    equals?: $Enums.LicensePlan | EnumLicensePlanFieldRefInput<$PrismaModel>
    in?: $Enums.LicensePlan[]
    notIn?: $Enums.LicensePlan[]
    not?: NestedEnumLicensePlanFilter<$PrismaModel> | $Enums.LicensePlan
  }

  export type NestedEnumLicenseStatusFilter<$PrismaModel = never> = {
    equals?: $Enums.LicenseStatus | EnumLicenseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LicenseStatus[]
    notIn?: $Enums.LicenseStatus[]
    not?: NestedEnumLicenseStatusFilter<$PrismaModel> | $Enums.LicenseStatus
  }

  export type NestedEnumLicensePlanWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LicensePlan | EnumLicensePlanFieldRefInput<$PrismaModel>
    in?: $Enums.LicensePlan[]
    notIn?: $Enums.LicensePlan[]
    not?: NestedEnumLicensePlanWithAggregatesFilter<$PrismaModel> | $Enums.LicensePlan
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLicensePlanFilter<$PrismaModel>
    _max?: NestedEnumLicensePlanFilter<$PrismaModel>
  }

  export type NestedEnumLicenseStatusWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.LicenseStatus | EnumLicenseStatusFieldRefInput<$PrismaModel>
    in?: $Enums.LicenseStatus[]
    notIn?: $Enums.LicenseStatus[]
    not?: NestedEnumLicenseStatusWithAggregatesFilter<$PrismaModel> | $Enums.LicenseStatus
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumLicenseStatusFilter<$PrismaModel>
    _max?: NestedEnumLicenseStatusFilter<$PrismaModel>
  }

  export type NestedEnumAuditActionFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[]
    notIn?: $Enums.AuditAction[]
    not?: NestedEnumAuditActionFilter<$PrismaModel> | $Enums.AuditAction
  }

  export type NestedEnumAuditActionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.AuditAction | EnumAuditActionFieldRefInput<$PrismaModel>
    in?: $Enums.AuditAction[]
    notIn?: $Enums.AuditAction[]
    not?: NestedEnumAuditActionWithAggregatesFilter<$PrismaModel> | $Enums.AuditAction
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumAuditActionFilter<$PrismaModel>
    _max?: NestedEnumAuditActionFilter<$PrismaModel>
  }

  export type NestedEnumBlacklistReasonFilter<$PrismaModel = never> = {
    equals?: $Enums.BlacklistReason | EnumBlacklistReasonFieldRefInput<$PrismaModel>
    in?: $Enums.BlacklistReason[]
    notIn?: $Enums.BlacklistReason[]
    not?: NestedEnumBlacklistReasonFilter<$PrismaModel> | $Enums.BlacklistReason
  }

  export type NestedEnumBlacklistReasonWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.BlacklistReason | EnumBlacklistReasonFieldRefInput<$PrismaModel>
    in?: $Enums.BlacklistReason[]
    notIn?: $Enums.BlacklistReason[]
    not?: NestedEnumBlacklistReasonWithAggregatesFilter<$PrismaModel> | $Enums.BlacklistReason
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumBlacklistReasonFilter<$PrismaModel>
    _max?: NestedEnumBlacklistReasonFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type DeviceUserCreateWithoutUserInput = {
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    licenses?: LicenseCreateNestedManyWithoutDeviceUserInput
  }

  export type DeviceUserUncheckedCreateWithoutUserInput = {
    id?: number
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    licenses?: LicenseUncheckedCreateNestedManyWithoutDeviceUserInput
  }

  export type DeviceUserCreateOrConnectWithoutUserInput = {
    where: DeviceUserWhereUniqueInput
    create: XOR<DeviceUserCreateWithoutUserInput, DeviceUserUncheckedCreateWithoutUserInput>
  }

  export type DeviceUserCreateManyUserInputEnvelope = {
    data: DeviceUserCreateManyUserInput | DeviceUserCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type LicenseCreateWithoutUserInput = {
    key: string
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    deviceUser?: DeviceUserCreateNestedOneWithoutLicensesInput
    server?: XtreamServerCreateNestedOneWithoutLicensesInput
  }

  export type LicenseUncheckedCreateWithoutUserInput = {
    id?: number
    key: string
    deviceUserId?: number | null
    serverId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseCreateOrConnectWithoutUserInput = {
    where: LicenseWhereUniqueInput
    create: XOR<LicenseCreateWithoutUserInput, LicenseUncheckedCreateWithoutUserInput>
  }

  export type LicenseCreateManyUserInputEnvelope = {
    data: LicenseCreateManyUserInput | LicenseCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type AuditLogCreateWithoutUserInput = {
    action: $Enums.AuditAction
    entity: string
    entityId?: number | null
    details?: string | null
    ipAddress?: string | null
    createdAt?: Date | string
  }

  export type AuditLogUncheckedCreateWithoutUserInput = {
    id?: number
    action: $Enums.AuditAction
    entity: string
    entityId?: number | null
    details?: string | null
    ipAddress?: string | null
    createdAt?: Date | string
  }

  export type AuditLogCreateOrConnectWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogCreateManyUserInputEnvelope = {
    data: AuditLogCreateManyUserInput | AuditLogCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type SessionCreateWithoutUserInput = {
    refreshToken: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionUncheckedCreateWithoutUserInput = {
    id?: number
    refreshToken: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type SessionCreateOrConnectWithoutUserInput = {
    where: SessionWhereUniqueInput
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionCreateManyUserInputEnvelope = {
    data: SessionCreateManyUserInput | SessionCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type ProfileCreateWithoutUserInput = {
    id?: string
    name: string
    avatarUrl?: string | null
    isKids?: boolean
    pin?: string | null
    lastUsed?: Date | string
  }

  export type ProfileUncheckedCreateWithoutUserInput = {
    id?: string
    name: string
    avatarUrl?: string | null
    isKids?: boolean
    pin?: string | null
    lastUsed?: Date | string
  }

  export type ProfileCreateOrConnectWithoutUserInput = {
    where: ProfileWhereUniqueInput
    create: XOR<ProfileCreateWithoutUserInput, ProfileUncheckedCreateWithoutUserInput>
  }

  export type ProfileCreateManyUserInputEnvelope = {
    data: ProfileCreateManyUserInput | ProfileCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type ParentalConfigCreateWithoutUserInput = {
    pin?: string
    lockedCategories: string
    isPinEnabled?: boolean
  }

  export type ParentalConfigUncheckedCreateWithoutUserInput = {
    id?: number
    pin?: string
    lockedCategories: string
    isPinEnabled?: boolean
  }

  export type ParentalConfigCreateOrConnectWithoutUserInput = {
    where: ParentalConfigWhereUniqueInput
    create: XOR<ParentalConfigCreateWithoutUserInput, ParentalConfigUncheckedCreateWithoutUserInput>
  }

  export type DeviceUserUpsertWithWhereUniqueWithoutUserInput = {
    where: DeviceUserWhereUniqueInput
    update: XOR<DeviceUserUpdateWithoutUserInput, DeviceUserUncheckedUpdateWithoutUserInput>
    create: XOR<DeviceUserCreateWithoutUserInput, DeviceUserUncheckedCreateWithoutUserInput>
  }

  export type DeviceUserUpdateWithWhereUniqueWithoutUserInput = {
    where: DeviceUserWhereUniqueInput
    data: XOR<DeviceUserUpdateWithoutUserInput, DeviceUserUncheckedUpdateWithoutUserInput>
  }

  export type DeviceUserUpdateManyWithWhereWithoutUserInput = {
    where: DeviceUserScalarWhereInput
    data: XOR<DeviceUserUpdateManyMutationInput, DeviceUserUncheckedUpdateManyWithoutUserInput>
  }

  export type DeviceUserScalarWhereInput = {
    AND?: DeviceUserScalarWhereInput | DeviceUserScalarWhereInput[]
    OR?: DeviceUserScalarWhereInput[]
    NOT?: DeviceUserScalarWhereInput | DeviceUserScalarWhereInput[]
    id?: IntFilter<"DeviceUser"> | number
    deviceId?: StringFilter<"DeviceUser"> | string
    softwareId?: StringNullableFilter<"DeviceUser"> | string | null
    mac?: StringNullableFilter<"DeviceUser"> | string | null
    brand?: StringNullableFilter<"DeviceUser"> | string | null
    model?: StringNullableFilter<"DeviceUser"> | string | null
    serial?: StringNullableFilter<"DeviceUser"> | string | null
    platform?: EnumPlatformNullableFilter<"DeviceUser"> | $Enums.Platform | null
    publicIp?: StringNullableFilter<"DeviceUser"> | string | null
    appVersion?: StringNullableFilter<"DeviceUser"> | string | null
    osVersion?: StringNullableFilter<"DeviceUser"> | string | null
    lastSeenAt?: DateTimeNullableFilter<"DeviceUser"> | Date | string | null
    userId?: IntNullableFilter<"DeviceUser"> | number | null
    createdAt?: DateTimeFilter<"DeviceUser"> | Date | string
    updatedAt?: DateTimeFilter<"DeviceUser"> | Date | string
    deletedAt?: DateTimeNullableFilter<"DeviceUser"> | Date | string | null
  }

  export type LicenseUpsertWithWhereUniqueWithoutUserInput = {
    where: LicenseWhereUniqueInput
    update: XOR<LicenseUpdateWithoutUserInput, LicenseUncheckedUpdateWithoutUserInput>
    create: XOR<LicenseCreateWithoutUserInput, LicenseUncheckedCreateWithoutUserInput>
  }

  export type LicenseUpdateWithWhereUniqueWithoutUserInput = {
    where: LicenseWhereUniqueInput
    data: XOR<LicenseUpdateWithoutUserInput, LicenseUncheckedUpdateWithoutUserInput>
  }

  export type LicenseUpdateManyWithWhereWithoutUserInput = {
    where: LicenseScalarWhereInput
    data: XOR<LicenseUpdateManyMutationInput, LicenseUncheckedUpdateManyWithoutUserInput>
  }

  export type LicenseScalarWhereInput = {
    AND?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
    OR?: LicenseScalarWhereInput[]
    NOT?: LicenseScalarWhereInput | LicenseScalarWhereInput[]
    id?: IntFilter<"License"> | number
    key?: StringFilter<"License"> | string
    userId?: IntNullableFilter<"License"> | number | null
    deviceUserId?: IntNullableFilter<"License"> | number | null
    serverId?: IntNullableFilter<"License"> | number | null
    xtreamUser?: StringNullableFilter<"License"> | string | null
    xtreamPass?: StringNullableFilter<"License"> | string | null
    plan?: EnumLicensePlanFilter<"License"> | $Enums.LicensePlan
    status?: EnumLicenseStatusFilter<"License"> | $Enums.LicenseStatus
    expiresAt?: DateTimeNullableFilter<"License"> | Date | string | null
    activatedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    lastUsedAt?: DateTimeNullableFilter<"License"> | Date | string | null
    createdAt?: DateTimeFilter<"License"> | Date | string
    updatedAt?: DateTimeFilter<"License"> | Date | string
    deletedAt?: DateTimeNullableFilter<"License"> | Date | string | null
  }

  export type AuditLogUpsertWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    update: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
    create: XOR<AuditLogCreateWithoutUserInput, AuditLogUncheckedCreateWithoutUserInput>
  }

  export type AuditLogUpdateWithWhereUniqueWithoutUserInput = {
    where: AuditLogWhereUniqueInput
    data: XOR<AuditLogUpdateWithoutUserInput, AuditLogUncheckedUpdateWithoutUserInput>
  }

  export type AuditLogUpdateManyWithWhereWithoutUserInput = {
    where: AuditLogScalarWhereInput
    data: XOR<AuditLogUpdateManyMutationInput, AuditLogUncheckedUpdateManyWithoutUserInput>
  }

  export type AuditLogScalarWhereInput = {
    AND?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    OR?: AuditLogScalarWhereInput[]
    NOT?: AuditLogScalarWhereInput | AuditLogScalarWhereInput[]
    id?: IntFilter<"AuditLog"> | number
    userId?: IntNullableFilter<"AuditLog"> | number | null
    action?: EnumAuditActionFilter<"AuditLog"> | $Enums.AuditAction
    entity?: StringFilter<"AuditLog"> | string
    entityId?: IntNullableFilter<"AuditLog"> | number | null
    details?: StringNullableFilter<"AuditLog"> | string | null
    ipAddress?: StringNullableFilter<"AuditLog"> | string | null
    createdAt?: DateTimeFilter<"AuditLog"> | Date | string
  }

  export type SessionUpsertWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    update: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
    create: XOR<SessionCreateWithoutUserInput, SessionUncheckedCreateWithoutUserInput>
  }

  export type SessionUpdateWithWhereUniqueWithoutUserInput = {
    where: SessionWhereUniqueInput
    data: XOR<SessionUpdateWithoutUserInput, SessionUncheckedUpdateWithoutUserInput>
  }

  export type SessionUpdateManyWithWhereWithoutUserInput = {
    where: SessionScalarWhereInput
    data: XOR<SessionUpdateManyMutationInput, SessionUncheckedUpdateManyWithoutUserInput>
  }

  export type SessionScalarWhereInput = {
    AND?: SessionScalarWhereInput | SessionScalarWhereInput[]
    OR?: SessionScalarWhereInput[]
    NOT?: SessionScalarWhereInput | SessionScalarWhereInput[]
    id?: IntFilter<"Session"> | number
    userId?: IntFilter<"Session"> | number
    refreshToken?: StringFilter<"Session"> | string
    expiresAt?: DateTimeFilter<"Session"> | Date | string
    createdAt?: DateTimeFilter<"Session"> | Date | string
  }

  export type ProfileUpsertWithWhereUniqueWithoutUserInput = {
    where: ProfileWhereUniqueInput
    update: XOR<ProfileUpdateWithoutUserInput, ProfileUncheckedUpdateWithoutUserInput>
    create: XOR<ProfileCreateWithoutUserInput, ProfileUncheckedCreateWithoutUserInput>
  }

  export type ProfileUpdateWithWhereUniqueWithoutUserInput = {
    where: ProfileWhereUniqueInput
    data: XOR<ProfileUpdateWithoutUserInput, ProfileUncheckedUpdateWithoutUserInput>
  }

  export type ProfileUpdateManyWithWhereWithoutUserInput = {
    where: ProfileScalarWhereInput
    data: XOR<ProfileUpdateManyMutationInput, ProfileUncheckedUpdateManyWithoutUserInput>
  }

  export type ProfileScalarWhereInput = {
    AND?: ProfileScalarWhereInput | ProfileScalarWhereInput[]
    OR?: ProfileScalarWhereInput[]
    NOT?: ProfileScalarWhereInput | ProfileScalarWhereInput[]
    id?: StringFilter<"Profile"> | string
    userId?: IntFilter<"Profile"> | number
    name?: StringFilter<"Profile"> | string
    avatarUrl?: StringNullableFilter<"Profile"> | string | null
    isKids?: BoolFilter<"Profile"> | boolean
    pin?: StringNullableFilter<"Profile"> | string | null
    lastUsed?: DateTimeFilter<"Profile"> | Date | string
  }

  export type ParentalConfigUpsertWithoutUserInput = {
    update: XOR<ParentalConfigUpdateWithoutUserInput, ParentalConfigUncheckedUpdateWithoutUserInput>
    create: XOR<ParentalConfigCreateWithoutUserInput, ParentalConfigUncheckedCreateWithoutUserInput>
    where?: ParentalConfigWhereInput
  }

  export type ParentalConfigUpdateToOneWithWhereWithoutUserInput = {
    where?: ParentalConfigWhereInput
    data: XOR<ParentalConfigUpdateWithoutUserInput, ParentalConfigUncheckedUpdateWithoutUserInput>
  }

  export type ParentalConfigUpdateWithoutUserInput = {
    pin?: StringFieldUpdateOperationsInput | string
    lockedCategories?: StringFieldUpdateOperationsInput | string
    isPinEnabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type ParentalConfigUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    pin?: StringFieldUpdateOperationsInput | string
    lockedCategories?: StringFieldUpdateOperationsInput | string
    isPinEnabled?: BoolFieldUpdateOperationsInput | boolean
  }

  export type UserCreateWithoutDevicesInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    licenses?: LicenseCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    profiles?: ProfileCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutDevicesInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    licenses?: LicenseUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    profiles?: ProfileUncheckedCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutDevicesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutDevicesInput, UserUncheckedCreateWithoutDevicesInput>
  }

  export type LicenseCreateWithoutDeviceUserInput = {
    key: string
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    user?: UserCreateNestedOneWithoutLicensesInput
    server?: XtreamServerCreateNestedOneWithoutLicensesInput
  }

  export type LicenseUncheckedCreateWithoutDeviceUserInput = {
    id?: number
    key: string
    userId?: number | null
    serverId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseCreateOrConnectWithoutDeviceUserInput = {
    where: LicenseWhereUniqueInput
    create: XOR<LicenseCreateWithoutDeviceUserInput, LicenseUncheckedCreateWithoutDeviceUserInput>
  }

  export type LicenseCreateManyDeviceUserInputEnvelope = {
    data: LicenseCreateManyDeviceUserInput | LicenseCreateManyDeviceUserInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutDevicesInput = {
    update: XOR<UserUpdateWithoutDevicesInput, UserUncheckedUpdateWithoutDevicesInput>
    create: XOR<UserCreateWithoutDevicesInput, UserUncheckedCreateWithoutDevicesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutDevicesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutDevicesInput, UserUncheckedUpdateWithoutDevicesInput>
  }

  export type UserUpdateWithoutDevicesInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    licenses?: LicenseUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    profiles?: ProfileUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutDevicesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    licenses?: LicenseUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    profiles?: ProfileUncheckedUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUncheckedUpdateOneWithoutUserNestedInput
  }

  export type LicenseUpsertWithWhereUniqueWithoutDeviceUserInput = {
    where: LicenseWhereUniqueInput
    update: XOR<LicenseUpdateWithoutDeviceUserInput, LicenseUncheckedUpdateWithoutDeviceUserInput>
    create: XOR<LicenseCreateWithoutDeviceUserInput, LicenseUncheckedCreateWithoutDeviceUserInput>
  }

  export type LicenseUpdateWithWhereUniqueWithoutDeviceUserInput = {
    where: LicenseWhereUniqueInput
    data: XOR<LicenseUpdateWithoutDeviceUserInput, LicenseUncheckedUpdateWithoutDeviceUserInput>
  }

  export type LicenseUpdateManyWithWhereWithoutDeviceUserInput = {
    where: LicenseScalarWhereInput
    data: XOR<LicenseUpdateManyMutationInput, LicenseUncheckedUpdateManyWithoutDeviceUserInput>
  }

  export type LicenseCreateWithoutServerInput = {
    key: string
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    user?: UserCreateNestedOneWithoutLicensesInput
    deviceUser?: DeviceUserCreateNestedOneWithoutLicensesInput
  }

  export type LicenseUncheckedCreateWithoutServerInput = {
    id?: number
    key: string
    userId?: number | null
    deviceUserId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseCreateOrConnectWithoutServerInput = {
    where: LicenseWhereUniqueInput
    create: XOR<LicenseCreateWithoutServerInput, LicenseUncheckedCreateWithoutServerInput>
  }

  export type LicenseCreateManyServerInputEnvelope = {
    data: LicenseCreateManyServerInput | LicenseCreateManyServerInput[]
    skipDuplicates?: boolean
  }

  export type LicenseUpsertWithWhereUniqueWithoutServerInput = {
    where: LicenseWhereUniqueInput
    update: XOR<LicenseUpdateWithoutServerInput, LicenseUncheckedUpdateWithoutServerInput>
    create: XOR<LicenseCreateWithoutServerInput, LicenseUncheckedCreateWithoutServerInput>
  }

  export type LicenseUpdateWithWhereUniqueWithoutServerInput = {
    where: LicenseWhereUniqueInput
    data: XOR<LicenseUpdateWithoutServerInput, LicenseUncheckedUpdateWithoutServerInput>
  }

  export type LicenseUpdateManyWithWhereWithoutServerInput = {
    where: LicenseScalarWhereInput
    data: XOR<LicenseUpdateManyMutationInput, LicenseUncheckedUpdateManyWithoutServerInput>
  }

  export type UserCreateWithoutLicensesInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    profiles?: ProfileCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutLicensesInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    profiles?: ProfileUncheckedCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutLicensesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutLicensesInput, UserUncheckedCreateWithoutLicensesInput>
  }

  export type DeviceUserCreateWithoutLicensesInput = {
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    user?: UserCreateNestedOneWithoutDevicesInput
  }

  export type DeviceUserUncheckedCreateWithoutLicensesInput = {
    id?: number
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    userId?: number | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type DeviceUserCreateOrConnectWithoutLicensesInput = {
    where: DeviceUserWhereUniqueInput
    create: XOR<DeviceUserCreateWithoutLicensesInput, DeviceUserUncheckedCreateWithoutLicensesInput>
  }

  export type XtreamServerCreateWithoutLicensesInput = {
    name: string
    url: string
    serverIdentity: string
    isActive?: boolean
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type XtreamServerUncheckedCreateWithoutLicensesInput = {
    id?: number
    name: string
    url: string
    serverIdentity: string
    isActive?: boolean
    isDefault?: boolean
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type XtreamServerCreateOrConnectWithoutLicensesInput = {
    where: XtreamServerWhereUniqueInput
    create: XOR<XtreamServerCreateWithoutLicensesInput, XtreamServerUncheckedCreateWithoutLicensesInput>
  }

  export type UserUpsertWithoutLicensesInput = {
    update: XOR<UserUpdateWithoutLicensesInput, UserUncheckedUpdateWithoutLicensesInput>
    create: XOR<UserCreateWithoutLicensesInput, UserUncheckedCreateWithoutLicensesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutLicensesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutLicensesInput, UserUncheckedUpdateWithoutLicensesInput>
  }

  export type UserUpdateWithoutLicensesInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    profiles?: ProfileUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutLicensesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    profiles?: ProfileUncheckedUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUncheckedUpdateOneWithoutUserNestedInput
  }

  export type DeviceUserUpsertWithoutLicensesInput = {
    update: XOR<DeviceUserUpdateWithoutLicensesInput, DeviceUserUncheckedUpdateWithoutLicensesInput>
    create: XOR<DeviceUserCreateWithoutLicensesInput, DeviceUserUncheckedCreateWithoutLicensesInput>
    where?: DeviceUserWhereInput
  }

  export type DeviceUserUpdateToOneWithWhereWithoutLicensesInput = {
    where?: DeviceUserWhereInput
    data: XOR<DeviceUserUpdateWithoutLicensesInput, DeviceUserUncheckedUpdateWithoutLicensesInput>
  }

  export type DeviceUserUpdateWithoutLicensesInput = {
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutDevicesNestedInput
  }

  export type DeviceUserUncheckedUpdateWithoutLicensesInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type XtreamServerUpsertWithoutLicensesInput = {
    update: XOR<XtreamServerUpdateWithoutLicensesInput, XtreamServerUncheckedUpdateWithoutLicensesInput>
    create: XOR<XtreamServerCreateWithoutLicensesInput, XtreamServerUncheckedCreateWithoutLicensesInput>
    where?: XtreamServerWhereInput
  }

  export type XtreamServerUpdateToOneWithWhereWithoutLicensesInput = {
    where?: XtreamServerWhereInput
    data: XOR<XtreamServerUpdateWithoutLicensesInput, XtreamServerUncheckedUpdateWithoutLicensesInput>
  }

  export type XtreamServerUpdateWithoutLicensesInput = {
    name?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    serverIdentity?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type XtreamServerUncheckedUpdateWithoutLicensesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    url?: StringFieldUpdateOperationsInput | string
    serverIdentity?: StringFieldUpdateOperationsInput | string
    isActive?: BoolFieldUpdateOperationsInput | boolean
    isDefault?: BoolFieldUpdateOperationsInput | boolean
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCreateWithoutAuditLogsInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserCreateNestedManyWithoutUserInput
    licenses?: LicenseCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    profiles?: ProfileCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutAuditLogsInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserUncheckedCreateNestedManyWithoutUserInput
    licenses?: LicenseUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    profiles?: ProfileUncheckedCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutAuditLogsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
  }

  export type UserUpsertWithoutAuditLogsInput = {
    update: XOR<UserUpdateWithoutAuditLogsInput, UserUncheckedUpdateWithoutAuditLogsInput>
    create: XOR<UserCreateWithoutAuditLogsInput, UserUncheckedCreateWithoutAuditLogsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAuditLogsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAuditLogsInput, UserUncheckedUpdateWithoutAuditLogsInput>
  }

  export type UserUpdateWithoutAuditLogsInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUpdateManyWithoutUserNestedInput
    licenses?: LicenseUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    profiles?: ProfileUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutAuditLogsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUncheckedUpdateManyWithoutUserNestedInput
    licenses?: LicenseUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    profiles?: ProfileUncheckedUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateWithoutSessionsInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserCreateNestedManyWithoutUserInput
    licenses?: LicenseCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    profiles?: ProfileCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutSessionsInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserUncheckedCreateNestedManyWithoutUserInput
    licenses?: LicenseUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    profiles?: ProfileUncheckedCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutSessionsInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
  }

  export type UserUpsertWithoutSessionsInput = {
    update: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
    create: XOR<UserCreateWithoutSessionsInput, UserUncheckedCreateWithoutSessionsInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSessionsInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSessionsInput, UserUncheckedUpdateWithoutSessionsInput>
  }

  export type UserUpdateWithoutSessionsInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUpdateManyWithoutUserNestedInput
    licenses?: LicenseUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    profiles?: ProfileUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutSessionsInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUncheckedUpdateManyWithoutUserNestedInput
    licenses?: LicenseUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    profiles?: ProfileUncheckedUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUncheckedUpdateOneWithoutUserNestedInput
  }

  export type UserCreateWithoutParentalConfigInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserCreateNestedManyWithoutUserInput
    licenses?: LicenseCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    profiles?: ProfileCreateNestedManyWithoutUserInput
  }

  export type UserUncheckedCreateWithoutParentalConfigInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserUncheckedCreateNestedManyWithoutUserInput
    licenses?: LicenseUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    profiles?: ProfileUncheckedCreateNestedManyWithoutUserInput
  }

  export type UserCreateOrConnectWithoutParentalConfigInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutParentalConfigInput, UserUncheckedCreateWithoutParentalConfigInput>
  }

  export type UserUpsertWithoutParentalConfigInput = {
    update: XOR<UserUpdateWithoutParentalConfigInput, UserUncheckedUpdateWithoutParentalConfigInput>
    create: XOR<UserCreateWithoutParentalConfigInput, UserUncheckedCreateWithoutParentalConfigInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutParentalConfigInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutParentalConfigInput, UserUncheckedUpdateWithoutParentalConfigInput>
  }

  export type UserUpdateWithoutParentalConfigInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUpdateManyWithoutUserNestedInput
    licenses?: LicenseUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    profiles?: ProfileUpdateManyWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutParentalConfigInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUncheckedUpdateManyWithoutUserNestedInput
    licenses?: LicenseUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    profiles?: ProfileUncheckedUpdateManyWithoutUserNestedInput
  }

  export type UserCreateWithoutProfilesInput = {
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserCreateNestedManyWithoutUserInput
    licenses?: LicenseCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogCreateNestedManyWithoutUserInput
    sessions?: SessionCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigCreateNestedOneWithoutUserInput
  }

  export type UserUncheckedCreateWithoutProfilesInput = {
    id?: number
    name: string
    email: string
    password: string
    role?: $Enums.UserRole
    isActive?: boolean
    authProvider?: $Enums.AuthProvider
    lastLoginAt?: Date | string | null
    lastLoginIp?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
    devices?: DeviceUserUncheckedCreateNestedManyWithoutUserInput
    licenses?: LicenseUncheckedCreateNestedManyWithoutUserInput
    auditLogs?: AuditLogUncheckedCreateNestedManyWithoutUserInput
    sessions?: SessionUncheckedCreateNestedManyWithoutUserInput
    parentalConfig?: ParentalConfigUncheckedCreateNestedOneWithoutUserInput
  }

  export type UserCreateOrConnectWithoutProfilesInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutProfilesInput, UserUncheckedCreateWithoutProfilesInput>
  }

  export type UserUpsertWithoutProfilesInput = {
    update: XOR<UserUpdateWithoutProfilesInput, UserUncheckedUpdateWithoutProfilesInput>
    create: XOR<UserCreateWithoutProfilesInput, UserUncheckedCreateWithoutProfilesInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutProfilesInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutProfilesInput, UserUncheckedUpdateWithoutProfilesInput>
  }

  export type UserUpdateWithoutProfilesInput = {
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUpdateManyWithoutUserNestedInput
    licenses?: LicenseUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUpdateManyWithoutUserNestedInput
    sessions?: SessionUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUpdateOneWithoutUserNestedInput
  }

  export type UserUncheckedUpdateWithoutProfilesInput = {
    id?: IntFieldUpdateOperationsInput | number
    name?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    password?: StringFieldUpdateOperationsInput | string
    role?: EnumUserRoleFieldUpdateOperationsInput | $Enums.UserRole
    isActive?: BoolFieldUpdateOperationsInput | boolean
    authProvider?: EnumAuthProviderFieldUpdateOperationsInput | $Enums.AuthProvider
    lastLoginAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastLoginIp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    devices?: DeviceUserUncheckedUpdateManyWithoutUserNestedInput
    licenses?: LicenseUncheckedUpdateManyWithoutUserNestedInput
    auditLogs?: AuditLogUncheckedUpdateManyWithoutUserNestedInput
    sessions?: SessionUncheckedUpdateManyWithoutUserNestedInput
    parentalConfig?: ParentalConfigUncheckedUpdateOneWithoutUserNestedInput
  }

  export type DeviceUserCreateManyUserInput = {
    id?: number
    deviceId: string
    softwareId?: string | null
    mac?: string | null
    brand?: string | null
    model?: string | null
    serial?: string | null
    platform?: $Enums.Platform | null
    publicIp?: string | null
    appVersion?: string | null
    osVersion?: string | null
    lastSeenAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseCreateManyUserInput = {
    id?: number
    key: string
    deviceUserId?: number | null
    serverId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type AuditLogCreateManyUserInput = {
    id?: number
    action: $Enums.AuditAction
    entity: string
    entityId?: number | null
    details?: string | null
    ipAddress?: string | null
    createdAt?: Date | string
  }

  export type SessionCreateManyUserInput = {
    id?: number
    refreshToken: string
    expiresAt: Date | string
    createdAt?: Date | string
  }

  export type ProfileCreateManyUserInput = {
    id?: string
    name: string
    avatarUrl?: string | null
    isKids?: boolean
    pin?: string | null
    lastUsed?: Date | string
  }

  export type DeviceUserUpdateWithoutUserInput = {
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    licenses?: LicenseUpdateManyWithoutDeviceUserNestedInput
  }

  export type DeviceUserUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    licenses?: LicenseUncheckedUpdateManyWithoutDeviceUserNestedInput
  }

  export type DeviceUserUncheckedUpdateManyWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    deviceId?: StringFieldUpdateOperationsInput | string
    softwareId?: NullableStringFieldUpdateOperationsInput | string | null
    mac?: NullableStringFieldUpdateOperationsInput | string | null
    brand?: NullableStringFieldUpdateOperationsInput | string | null
    model?: NullableStringFieldUpdateOperationsInput | string | null
    serial?: NullableStringFieldUpdateOperationsInput | string | null
    platform?: NullableEnumPlatformFieldUpdateOperationsInput | $Enums.Platform | null
    publicIp?: NullableStringFieldUpdateOperationsInput | string | null
    appVersion?: NullableStringFieldUpdateOperationsInput | string | null
    osVersion?: NullableStringFieldUpdateOperationsInput | string | null
    lastSeenAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseUpdateWithoutUserInput = {
    key?: StringFieldUpdateOperationsInput | string
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    deviceUser?: DeviceUserUpdateOneWithoutLicensesNestedInput
    server?: XtreamServerUpdateOneWithoutLicensesNestedInput
  }

  export type LicenseUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    deviceUserId?: NullableIntFieldUpdateOperationsInput | number | null
    serverId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseUncheckedUpdateManyWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    deviceUserId?: NullableIntFieldUpdateOperationsInput | number | null
    serverId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type AuditLogUpdateWithoutUserInput = {
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AuditLogUncheckedUpdateManyWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    action?: EnumAuditActionFieldUpdateOperationsInput | $Enums.AuditAction
    entity?: StringFieldUpdateOperationsInput | string
    entityId?: NullableIntFieldUpdateOperationsInput | number | null
    details?: NullableStringFieldUpdateOperationsInput | string | null
    ipAddress?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUpdateWithoutUserInput = {
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SessionUncheckedUpdateManyWithoutUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    refreshToken?: StringFieldUpdateOperationsInput | string
    expiresAt?: DateTimeFieldUpdateOperationsInput | Date | string
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileUncheckedUpdateWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type ProfileUncheckedUpdateManyWithoutUserInput = {
    id?: StringFieldUpdateOperationsInput | string
    name?: StringFieldUpdateOperationsInput | string
    avatarUrl?: NullableStringFieldUpdateOperationsInput | string | null
    isKids?: BoolFieldUpdateOperationsInput | boolean
    pin?: NullableStringFieldUpdateOperationsInput | string | null
    lastUsed?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type LicenseCreateManyDeviceUserInput = {
    id?: number
    key: string
    userId?: number | null
    serverId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseUpdateWithoutDeviceUserInput = {
    key?: StringFieldUpdateOperationsInput | string
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutLicensesNestedInput
    server?: XtreamServerUpdateOneWithoutLicensesNestedInput
  }

  export type LicenseUncheckedUpdateWithoutDeviceUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    serverId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseUncheckedUpdateManyWithoutDeviceUserInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    serverId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseCreateManyServerInput = {
    id?: number
    key: string
    userId?: number | null
    deviceUserId?: number | null
    xtreamUser?: string | null
    xtreamPass?: string | null
    plan?: $Enums.LicensePlan
    status?: $Enums.LicenseStatus
    expiresAt?: Date | string | null
    activatedAt?: Date | string | null
    lastUsedAt?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    deletedAt?: Date | string | null
  }

  export type LicenseUpdateWithoutServerInput = {
    key?: StringFieldUpdateOperationsInput | string
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    user?: UserUpdateOneWithoutLicensesNestedInput
    deviceUser?: DeviceUserUpdateOneWithoutLicensesNestedInput
  }

  export type LicenseUncheckedUpdateWithoutServerInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    deviceUserId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type LicenseUncheckedUpdateManyWithoutServerInput = {
    id?: IntFieldUpdateOperationsInput | number
    key?: StringFieldUpdateOperationsInput | string
    userId?: NullableIntFieldUpdateOperationsInput | number | null
    deviceUserId?: NullableIntFieldUpdateOperationsInput | number | null
    xtreamUser?: NullableStringFieldUpdateOperationsInput | string | null
    xtreamPass?: NullableStringFieldUpdateOperationsInput | string | null
    plan?: EnumLicensePlanFieldUpdateOperationsInput | $Enums.LicensePlan
    status?: EnumLicenseStatusFieldUpdateOperationsInput | $Enums.LicenseStatus
    expiresAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    activatedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    lastUsedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    deletedAt?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}