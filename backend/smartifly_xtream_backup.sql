--
-- PostgreSQL database dump
--

\restrict ZJ7izzjqY31w58zsrZUiKuLealJhn5sFPfCB2R90qBgDWoDpZ29k8vvnKUxIbxi

-- Dumped from database version 17.7 (Debian 17.7-3.pgdg13+1)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ABTestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ABTestStatus" AS ENUM (
    'DRAFT',
    'RUNNING',
    'COMPLETED',
    'STOPPED'
);


ALTER TYPE public."ABTestStatus" OWNER TO postgres;

--
-- Name: AnnouncementPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnnouncementPriority" AS ENUM (
    'LOW',
    'NORMAL',
    'URGENT'
);


ALTER TYPE public."AnnouncementPriority" OWNER TO postgres;

--
-- Name: AnnouncementStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnnouncementStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


ALTER TYPE public."AnnouncementStatus" OWNER TO postgres;

--
-- Name: AnnouncementType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AnnouncementType" AS ENUM (
    'INFO',
    'WARNING',
    'MAINTENANCE',
    'UPDATE'
);


ALTER TYPE public."AnnouncementType" OWNER TO postgres;

--
-- Name: BackupStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."BackupStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'COMPLETED',
    'FAILED'
);


ALTER TYPE public."BackupStatus" OWNER TO postgres;

--
-- Name: MaintenanceStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MaintenanceStatus" AS ENUM (
    'SCHEDULED',
    'ACTIVE',
    'COMPLETED',
    'CANCELLED'
);


ALTER TYPE public."MaintenanceStatus" OWNER TO postgres;

--
-- Name: NotificationStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."NotificationStatus" AS ENUM (
    'PENDING',
    'SCHEDULED',
    'SENT',
    'FAILED',
    'CANCELLED'
);


ALTER TYPE public."NotificationStatus" OWNER TO postgres;

--
-- Name: TicketPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


ALTER TYPE public."TicketPriority" OWNER TO postgres;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'OPEN',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


ALTER TYPE public."TicketStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ABTest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ABTest" (
    id text NOT NULL,
    name text NOT NULL,
    status public."ABTestStatus" DEFAULT 'RUNNING'::public."ABTestStatus" NOT NULL,
    variants jsonb NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone,
    "winnerVariant" text,
    metrics jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ABTest" OWNER TO postgres;

--
-- Name: Admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admin" (
    id text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    name text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Admin" OWNER TO postgres;

--
-- Name: AnalyticsSnapshot; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AnalyticsSnapshot" (
    id text NOT NULL,
    date date NOT NULL,
    "ticketsCreated" integer DEFAULT 0 NOT NULL,
    "ticketsResolved" integer DEFAULT 0 NOT NULL,
    "avgResolutionTime" double precision,
    "ticketsOpen" integer DEFAULT 0 NOT NULL,
    "ticketsInProgress" integer DEFAULT 0 NOT NULL,
    "ticketsClosed" integer DEFAULT 0 NOT NULL,
    "portalConnections" integer DEFAULT 0 NOT NULL,
    "portalUptimeAvg" double precision,
    "notificationsSent" integer DEFAULT 0 NOT NULL,
    "notificationsDelivered" integer DEFAULT 0 NOT NULL,
    "notificationsFailed" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AnalyticsSnapshot" OWNER TO postgres;

--
-- Name: Announcement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Announcement" (
    id text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    type public."AnnouncementType" DEFAULT 'INFO'::public."AnnouncementType" NOT NULL,
    priority public."AnnouncementPriority" DEFAULT 'NORMAL'::public."AnnouncementPriority" NOT NULL,
    status public."AnnouncementStatus" DEFAULT 'DRAFT'::public."AnnouncementStatus" NOT NULL,
    audience text,
    "isActive" boolean DEFAULT true NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Announcement" OWNER TO postgres;

--
-- Name: AppSettings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AppSettings" (
    id text DEFAULT 'main'::text NOT NULL,
    "maintenanceMode" boolean DEFAULT false NOT NULL,
    "maintenanceMsg" text,
    "latestVersion" text DEFAULT '1.0.0'::text NOT NULL,
    "minVersion" text DEFAULT '1.0.0'::text NOT NULL,
    "updateUrl" text,
    "forceUpdate" boolean DEFAULT false NOT NULL,
    "contactEmail" text,
    "contactPhone" text,
    "aboutText" text,
    "termsUrl" text,
    "privacyUrl" text,
    "bankName" text,
    "accountTitle" text,
    "accountNumber" text,
    iban text,
    "paymentInstructions" text,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."AppSettings" OWNER TO postgres;

--
-- Name: Backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Backup" (
    id text NOT NULL,
    filename text NOT NULL,
    size integer NOT NULL,
    status public."BackupStatus" DEFAULT 'PENDING'::public."BackupStatus" NOT NULL,
    url text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Backup" OWNER TO postgres;

--
-- Name: DeviceToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."DeviceToken" (
    id text NOT NULL,
    token text NOT NULL,
    platform text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."DeviceToken" OWNER TO postgres;

--
-- Name: FeatureFlag; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FeatureFlag" (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    "isEnabled" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeatureFlag" OWNER TO postgres;

--
-- Name: FeatureTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."FeatureTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."FeatureTemplate" OWNER TO postgres;

--
-- Name: MaintenanceWindow; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."MaintenanceWindow" (
    id text NOT NULL,
    "startTime" timestamp(3) without time zone NOT NULL,
    "endTime" timestamp(3) without time zone NOT NULL,
    reason text,
    status public."MaintenanceStatus" DEFAULT 'SCHEDULED'::public."MaintenanceStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MaintenanceWindow" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb,
    "sentAt" timestamp(3) without time zone,
    "sentBy" text,
    status public."NotificationStatus" DEFAULT 'PENDING'::public."NotificationStatus" NOT NULL,
    "scheduledAt" timestamp(3) without time zone,
    error text,
    "openedAt" timestamp(3) without time zone,
    "templateId" text,
    "segmentId" text,
    "abTestId" text,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: NotificationSegment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NotificationSegment" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    filters jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."NotificationSegment" OWNER TO postgres;

--
-- Name: NotificationTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."NotificationTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    data jsonb,
    "imageUrl" text,
    "deepLink" text,
    category text DEFAULT 'General'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."NotificationTemplate" OWNER TO postgres;

--
-- Name: Package; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Package" (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    duration text NOT NULL,
    price double precision NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    "isPopular" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "order" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Package" OWNER TO postgres;

--
-- Name: PackageAnalytics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PackageAnalytics" (
    id text NOT NULL,
    "packageId" text NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    purchases integer DEFAULT 0 NOT NULL,
    revenue double precision DEFAULT 0 NOT NULL,
    "conversionRate" double precision DEFAULT 0 NOT NULL,
    "lastViewedAt" timestamp(3) without time zone,
    "lastPurchasedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PackageAnalytics" OWNER TO postgres;

--
-- Name: Portal; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Portal" (
    id text NOT NULL,
    "displayId" integer NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    username text,
    password text,
    "order" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    description text,
    category text DEFAULT 'General'::text NOT NULL,
    "healthStatus" text DEFAULT 'UNKNOWN'::text NOT NULL,
    "lastCheckAt" timestamp(3) without time zone,
    latency integer,
    uptime double precision,
    "activeConnections" integer DEFAULT 0 NOT NULL,
    "errorCount" integer DEFAULT 0 NOT NULL,
    "serverIp" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Portal" OWNER TO postgres;

--
-- Name: Portal_displayId_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Portal_displayId_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Portal_displayId_seq" OWNER TO postgres;

--
-- Name: Portal_displayId_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Portal_displayId_seq" OWNED BY public."Portal"."displayId";


--
-- Name: PricingTier; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PricingTier" (
    id text NOT NULL,
    "packageId" text NOT NULL,
    "minQuantity" integer NOT NULL,
    "maxQuantity" integer,
    price double precision NOT NULL,
    discount double precision,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."PricingTier" OWNER TO postgres;

--
-- Name: RefreshToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."RefreshToken" (
    id text NOT NULL,
    token text NOT NULL,
    "adminId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."RefreshToken" OWNER TO postgres;

--
-- Name: Reply; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Reply" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    message text NOT NULL,
    "isAdmin" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Reply" OWNER TO postgres;

--
-- Name: SubscriptionRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SubscriptionRequest" (
    id text NOT NULL,
    "packageId" text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    "phoneNumber" text NOT NULL,
    "verificationToken" text NOT NULL,
    "isEmailVerified" boolean DEFAULT false NOT NULL,
    "verifiedAt" timestamp(3) without time zone,
    "pdfSentAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SubscriptionRequest" OWNER TO postgres;

--
-- Name: SystemAuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SystemAuditLog" (
    id text NOT NULL,
    "adminId" text,
    action text NOT NULL,
    resource text NOT NULL,
    details jsonb,
    "ipAddress" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."SystemAuditLog" OWNER TO postgres;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "ticketNo" text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    status public."TicketStatus" DEFAULT 'OPEN'::public."TicketStatus" NOT NULL,
    priority public."TicketPriority" DEFAULT 'MEDIUM'::public."TicketPriority" NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    "firstResponseAt" timestamp(3) without time zone,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO postgres;

--
-- Name: TicketAttachment; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketAttachment" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    filename text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileType" text NOT NULL,
    "fileSize" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TicketAttachment" OWNER TO postgres;

--
-- Name: TicketTemplate; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketTemplate" (
    id text NOT NULL,
    name text NOT NULL,
    content text NOT NULL,
    category text DEFAULT 'General'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TicketTemplate" OWNER TO postgres;

--
-- Name: Portal displayId; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Portal" ALTER COLUMN "displayId" SET DEFAULT nextval('public."Portal_displayId_seq"'::regclass);


--
-- Data for Name: ABTest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ABTest" (id, name, status, variants, "startDate", "endDate", "winnerVariant", metrics, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admin" (id, email, password, name, "createdAt", "updatedAt") FROM stdin;
b05f64c3-cadf-430e-9948-594997e596f9	admin@smartifly.com	$2a$12$dcGDUvZ6hE4pLsuzibtam.HIiWrD5vTtvceo3LiZyn/7yXxJcCm0q	Admin	2026-01-09 16:40:02.221	2026-01-09 16:40:02.221
\.


--
-- Data for Name: AnalyticsSnapshot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AnalyticsSnapshot" (id, date, "ticketsCreated", "ticketsResolved", "avgResolutionTime", "ticketsOpen", "ticketsInProgress", "ticketsClosed", "portalConnections", "portalUptimeAvg", "notificationsSent", "notificationsDelivered", "notificationsFailed", "createdAt") FROM stdin;
5133ab02-1d0a-4651-af1f-b9df91efca5c	2026-01-27	0	0	\N	1	2	2	0	100	0	0	0	2026-01-28 09:02:29.149
3ecfa2d8-14b5-46ef-8cf5-209973ff1aa8	2026-01-16	0	0	\N	2	1	2	0	\N	0	0	0	2026-01-16 12:28:55.194
d637749d-1f90-41fa-b6bc-ca367ccf74c8	2026-01-17	0	0	\N	2	1	2	0	\N	0	0	0	2026-01-17 12:13:57.667
907fbcfd-9de8-408a-9887-475534d1067d	2026-01-18	0	0	\N	2	1	2	0	\N	0	0	0	2026-01-19 10:49:19.749
19a7e413-9f19-41e8-a6cb-a05c688c5de4	2026-01-19	0	0	\N	2	1	2	0	\N	0	0	0	2026-01-19 10:49:19.769
4b1032b3-11e4-4701-9579-fd7d3cd98325	2026-01-21	0	0	\N	1	2	2	0	100	0	0	0	2026-01-22 09:08:59.649
3393d5a0-0e90-4452-9f64-b25d457c051a	2026-01-28	0	0	\N	1	2	2	0	100	0	0	0	2026-01-28 09:02:29.164
b7d2ea09-d569-4316-acd5-00e367b5921b	2026-01-08	0	0	\N	2	0	1	0	\N	0	0	0	2026-01-09 13:57:02.151
9f6719dc-5788-498a-9e1f-e2a2f15b44fd	2026-01-12	0	0	\N	2	1	1	0	\N	0	0	0	2026-01-12 07:41:16.96
7cfd8b2b-d4de-4df7-8ada-3a6250bd9da2	2026-01-23	0	0	\N	1	2	2	0	100	0	0	0	2026-01-23 11:29:04.266
f6cd991d-7eab-4c65-870f-b86082f5029d	2026-01-24	0	0	\N	1	2	2	0	100	0	0	0	2026-01-24 08:50:24.449
18cc2112-d8b9-478c-a279-d1b6779f894b	2026-01-30	0	0	\N	1	2	2	0	100	0	0	0	2026-01-30 11:42:44.067
dc19729d-7fa3-4663-8424-2c2a29588c4c	2026-01-13	0	0	\N	2	1	1	0	\N	0	0	0	2026-01-13 08:19:15.846
f8a7b3b5-3246-4e1a-84d3-3909d91c4992	2026-01-25	0	0	\N	1	2	2	0	100	0	0	0	2026-01-26 11:14:26.054
c936f335-6400-4fc1-b5b5-57b4feb95023	2026-01-26	0	0	\N	1	2	2	0	100	0	0	0	2026-01-26 11:14:26.067
1417c85a-f72a-4080-bb2d-d9167c07d153	2026-01-09	3	1	0.03657555555555556	2	1	1	0	\N	0	0	0	2026-01-09 13:57:02.27
068092e3-3967-469a-80bf-c3cadf1154c7	2026-01-10	1	0	\N	2	1	1	0	\N	0	0	0	2026-01-10 06:45:06.169
0cab88be-8d1d-4ac0-91e9-ea3886fc3f06	2026-01-14	0	0	\N	2	1	2	0	\N	0	0	0	2026-01-14 08:37:13.404
16a6ca0a-3a42-416c-a5b8-91ab9e121fab	2026-01-11	0	0	\N	2	1	1	0	\N	0	0	0	2026-01-12 07:41:16.942
e0baba10-c431-48c9-8859-7fed660b5cac	2026-01-29	0	0	\N	1	2	2	0	100	0	0	0	2026-01-30 11:42:44.052
15863206-f58c-4f4f-b27f-5be97f1e48b1	2026-01-22	0	3	258.2802187962963	1	2	2	0	100	0	0	4	2026-01-22 09:08:59.67
f7dd634c-79ab-4d51-8e7f-c665d60d36e7	2026-01-15	1	1	118.8637511111111	2	1	2	0	\N	0	0	0	2026-01-15 14:05:21.66
fe44272b-2753-40e1-889c-8a75eaf0d23c	2026-02-06	0	0	\N	1	2	3	0	100	0	0	0	2026-02-06 00:00:00.136
08179147-8a75-4fb0-830c-d9de2fc50136	2026-02-07	0	0	\N	1	2	3	0	100	0	0	0	2026-02-07 00:00:00.134
4b95d2a4-bf34-449b-9241-ace3a610d017	2026-01-31	0	0	\N	1	2	2	0	100	0	0	0	2026-01-31 06:30:29.243
79a46e7c-65f8-4deb-b5fb-daa6fc90002e	2026-02-08	0	0	\N	1	2	3	0	100	0	0	0	2026-02-08 00:00:00.158
c26fa78c-d26b-4049-be69-3371ca6e0f08	2026-02-11	0	0	\N	1	2	3	0	100	0	0	0	2026-02-11 00:00:00.144
31fcbc7c-cfc8-4529-b5a9-378db59c96db	2026-02-09	0	0	\N	1	2	3	0	100	0	0	0	2026-02-09 00:00:00.097
ba9cc79e-aaeb-464d-ba7b-adf99ae6ef00	2026-02-10	0	0	\N	1	2	3	0	100	0	0	0	2026-02-10 00:00:00.104
c793bd13-c431-4a97-9520-9c6433688eb3	2026-02-01	0	0	\N	1	2	3	0	100	0	0	0	2026-02-01 07:22:31.848
06bf116b-7808-4e07-9496-89b5b44bf733	2026-02-02	1	1	0.01066833333333333	1	2	3	0	100	0	0	0	2026-02-02 09:45:29.768
00aca26f-2a02-4c2d-9864-a8851068fd37	2026-02-03	0	0	\N	1	2	3	0	100	0	0	0	2026-02-03 00:00:00.175
e2c4b227-3879-45e6-b5b8-69715c94a672	2026-02-04	0	0	\N	1	2	3	0	100	0	0	0	2026-02-04 00:00:00.086
39aba86f-643a-47b7-a095-75eb9d64452f	2026-02-05	0	0	\N	1	2	3	0	100	0	0	0	2026-02-05 00:00:00.097
\.


--
-- Data for Name: Announcement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Announcement" (id, title, content, type, priority, status, audience, "isActive", views, "scheduledAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
43284d21-757e-42ad-ac8d-335d5612b375	UpComing	<p>We&nbsp;are&nbsp;hiring&nbsp;new&nbsp;member.</p>	INFO	URGENT	PUBLISHED	"ALL"	t	0	\N	\N	2026-01-10 15:25:59.69	2026-01-10 15:28:52.617
d41e0011-f438-4560-98a7-809d25fdcd3a	Scheduled Maintenance	<p>Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii\tHiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;Hiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiiii&nbsp;&nbsp;</p>	MAINTENANCE	NORMAL	ARCHIVED	"ALL"	t	0	2026-01-22 16:36:00	2026-01-23 16:37:00	2026-01-13 11:37:27.291	2026-01-23 16:37:00.006
\.


--
-- Data for Name: AppSettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AppSettings" (id, "maintenanceMode", "maintenanceMsg", "latestVersion", "minVersion", "updateUrl", "forceUpdate", "contactEmail", "contactPhone", "aboutText", "termsUrl", "privacyUrl", "bankName", "accountTitle", "accountNumber", iban, "paymentInstructions", "updatedAt") FROM stdin;
main	f	\N	1.0.0	1.0.0	\N	f	\N	\N	\N	\N	\N	UBL	UBL	21212211211212121	21212121212211		2026-01-10 13:16:30.007
\.


--
-- Data for Name: Backup; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Backup" (id, filename, size, status, url, "createdAt") FROM stdin;
\.


--
-- Data for Name: DeviceToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DeviceToken" (id, token, platform, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FeatureFlag; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FeatureFlag" (id, key, name, description, "isEnabled", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: FeatureTemplate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."FeatureTemplate" (id, name, description, features, category, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MaintenanceWindow; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."MaintenanceWindow" (id, "startTime", "endTime", reason, status, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, title, body, data, "sentAt", "sentBy", status, "scheduledAt", error, "openedAt", "templateId", "segmentId", "abTestId", "updatedAt", "createdAt") FROM stdin;
bec0f43d-ebdf-441b-a3dc-f96ae2a70f6b	yfrtyfguytyutytyutu	yuyuryurtyuyyur	{}	\N	b05f64c3-cadf-430e-9948-594997e596f9	SCHEDULED	2026-01-10 20:45:00	\N	\N	\N	\N	\N	2026-01-10 15:44:03.427	2026-01-10 15:44:03.427
723a82b1-6882-4ab8-b44a-8e2f0eb05345	new update 	update 2.0	{}	\N	b05f64c3-cadf-430e-9948-594997e596f9	FAILED	\N	No devices found for targeting	\N	\N	\N	\N	2026-01-22 09:18:32.208	2026-01-22 09:18:32.205
b72be60c-b9b3-4ca6-a212-efeffee6813b	new update 	update 2.0	{}	\N	b05f64c3-cadf-430e-9948-594997e596f9	FAILED	\N	No devices found for targeting	\N	\N	\N	\N	2026-01-22 09:18:33.547	2026-01-22 09:18:33.544
4e9dd12a-ad7f-45fa-ba19-035561ce3a15	hi	hiiiiiiiiiii	{}	\N	b05f64c3-cadf-430e-9948-594997e596f9	FAILED	\N	No devices found for targeting	\N	\N	\N	\N	2026-01-22 09:19:08.475	2026-01-22 09:19:08.471
91758472-1eed-4eeb-8e0b-494dc8e8b4a8	hi	hiiiiiiiiiii	{}	\N	b05f64c3-cadf-430e-9948-594997e596f9	FAILED	\N	No devices found for targeting	\N	\N	\N	\N	2026-01-22 09:19:09.783	2026-01-22 09:19:09.781
\.


--
-- Data for Name: NotificationSegment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NotificationSegment" (id, name, description, filters, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: NotificationTemplate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."NotificationTemplate" (id, name, title, body, data, "imageUrl", "deepLink", category, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Package; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Package" (id, name, description, duration, price, currency, features, "isPopular", "isActive", "order", "createdAt", "updatedAt") FROM stdin;
ac84fddb-f536-49e2-992f-261efdbe2074	Standard	Best value for families. HD quality streaming.	3 Months	24.99	USD	["1000+ Channels", "2 Devices", "Priority Support", "VOD Access"]	t	t	0	2026-01-09 16:00:20.64	2026-01-10 13:38:42.842
d9232973-09de-4167-8a86-42c442fadf81	Basic Plan	Perfect for beginners. Access to 500+ channels.	1 Month	9.99	USD	["500+ Channels", "SD Quality", "1 Device", "Email Support"]	f	t	0	2026-01-10 13:39:20.842	2026-01-10 13:39:52.848
b06da036-6f9b-4735-9320-1716312fbb87	Premium Plan	Heavy Plan	1 Month	52	USD	["1.Email Support", "2.Email Support", "Email Support", "17 Device"]	f	t	0	2026-01-10 15:53:37.558	2026-01-10 15:55:32.625
\.


--
-- Data for Name: PackageAnalytics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PackageAnalytics" (id, "packageId", views, purchases, revenue, "conversionRate", "lastViewedAt", "lastPurchasedAt", "updatedAt") FROM stdin;
d4297536-7eb6-445c-8ede-653127e70433	ac84fddb-f536-49e2-992f-261efdbe2074	1	0	0	0	2026-01-22 09:30:48.345	\N	2026-01-22 09:30:48.346
\.


--
-- Data for Name: Portal; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Portal" (id, "displayId", name, url, username, password, "order", "isActive", description, category, "healthStatus", "lastCheckAt", latency, uptime, "activeConnections", "errorCount", "serverIp", "createdAt", "updatedAt") FROM stdin;
36a0c0eb-6b7f-4e44-9f9b-a00c5b51fe73	8	Asia Server	http://103.120.71.123:25461	\N	\N	0	t	\N	General	ONLINE	2026-01-23 18:48:22.15	969	100	0	0		2026-01-23 14:27:30.269	2026-02-01 13:53:38.732
\.


--
-- Data for Name: PricingTier; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PricingTier" (id, "packageId", "minQuantity", "maxQuantity", price, discount, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: RefreshToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."RefreshToken" (id, token, "adminId", "expiresAt", "createdAt") FROM stdin;
df448bcd-80aa-4619-a5d9-bc6df462697c	76d22908-9666-491e-8570-31fc42e2240c	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-16 16:45:46.085	2026-01-09 16:45:46.086
ee660b4b-40fc-43ca-a701-7785a4d6dca3	c889b966-3015-4c8a-ab18-d527708ea466	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-16 18:23:09.261	2026-01-09 18:23:09.262
ea4c2b03-c8cb-4273-bc60-5932c6c31aed	ea506209-00cb-4e02-8bbc-2f9f6e03c2a0	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 06:45:29.214	2026-01-10 06:45:29.215
097cae2c-2e89-4370-909e-658146ec1572	ba18895b-24d4-4fd7-966f-5c012a936d69	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 13:01:09.271	2026-01-10 13:01:09.272
d999dfee-a277-4106-b331-9a6febea4e35	e2141609-9c2a-4d86-8310-9e97aaab7855	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 13:33:02.984	2026-01-10 13:33:02.985
1884599e-8980-4b61-833c-5318572f4dfa	63de338c-b04c-418c-b1ea-dd0cea4da4c2	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 15:20:07.94	2026-01-10 15:20:07.941
7f1b5f7a-de19-4480-9064-5a4af88fae9b	654468cc-98ee-46d6-977c-e28136269772	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 15:24:44.673	2026-01-10 15:24:44.673
41964e8e-e027-4694-9ddb-8e59ed272163	26a677db-9ee5-4b58-8f61-b707699712cd	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 15:25:31.306	2026-01-10 15:25:31.307
6d1cd618-eb8e-4494-bc72-151fc62578dc	8fc4417b-3f09-4dc6-83ca-f5c755904be7	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 15:42:11.625	2026-01-10 15:42:11.625
b2b08331-bc80-49f9-9b6e-66f301d7f63d	aa7ae726-2b90-4f5f-93fe-2d8baf359dbd	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 15:52:25.807	2026-01-10 15:52:25.808
e691a17f-2236-4cbb-b93c-583da687d4f3	69b8182d-ec0c-4656-974f-a76f83230d12	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 18:35:26.831	2026-01-10 18:35:26.832
87f3791c-3170-499a-9ff1-33eb571ceff4	90d46fb3-89c1-4e3d-a77a-1cc446c1b35a	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-17 19:56:39.678	2026-01-10 19:56:39.678
0bb7a903-e7ab-4dea-bc29-4ab601e3a78e	76e13eff-ae99-43f1-b98e-9418c7c47857	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-20 16:01:56.999	2026-01-13 16:01:56.999
49afb5ee-f2f0-4267-8ceb-9ffc8da5f03d	521bf852-aa17-4228-b6e2-7d4e6aab79a6	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-21 14:24:21.297	2026-01-14 14:24:21.297
d82d27aa-c06c-47c2-8477-c1a46a9b44c5	85661433-e2a4-4a74-b5d4-9f95ad54bec0	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-22 14:06:22.706	2026-01-15 14:06:22.707
48cf147e-302f-4c66-8c69-296bce01b953	524f520d-e978-4c9c-a508-de3142dc418b	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-29 10:06:09.337	2026-01-22 10:06:09.338
fe9a07cc-a761-4067-8e1d-00a24e7e3771	4c9c0bb0-48f3-4b0e-bd09-40651c436565	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-30 14:26:38.683	2026-01-23 14:26:38.684
4aa70b9b-baab-43db-8cd9-d197d4c4e3ff	ee6bc4b7-0d74-46c3-960d-e554f66ee3b2	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-30 16:07:32.851	2026-01-23 16:07:32.852
93174065-a7df-41be-84db-5af0224272b6	e87f9188-2cdc-492f-a9e7-17596e20d173	b05f64c3-cadf-430e-9948-594997e596f9	2026-01-30 18:48:10.786	2026-01-23 18:48:10.787
1181c9b7-479b-4fad-9215-038dac4c692a	2dbadb3c-5cc4-4a66-af29-5b3b003e7339	b05f64c3-cadf-430e-9948-594997e596f9	2026-02-06 14:04:47.989	2026-01-30 14:04:47.99
e3150067-b562-4845-aa7d-3da70d8071f0	0409a00b-5c6e-4a37-903b-ffbb397b2f2e	b05f64c3-cadf-430e-9948-594997e596f9	2026-02-06 15:12:27.37	2026-01-30 15:12:27.37
1f45da13-75f7-480f-b3df-8066f85d13a3	3d6a62e1-94d5-4426-b878-b418d97fe421	b05f64c3-cadf-430e-9948-594997e596f9	2026-02-07 18:01:26.694	2026-01-31 18:01:26.694
6617d863-c52a-4d0d-aa98-73aae8a8103f	c6dad2f6-4cbe-476b-ab5e-e07c19e0a5a5	b05f64c3-cadf-430e-9948-594997e596f9	2026-02-08 13:53:10.075	2026-02-01 13:53:10.076
b4981abc-7495-4628-9213-6d21acc2abc4	d3c2d1f0-babf-40f5-8949-24cb0aa4624d	b05f64c3-cadf-430e-9948-594997e596f9	2026-02-12 13:32:50.847	2026-02-05 13:32:50.848
cd00badf-e8cf-47e1-84b5-7c11ec6cbaa4	754c96ba-a952-4d4b-b6cc-3a0655239051	b05f64c3-cadf-430e-9948-594997e596f9	2026-02-12 14:11:55.708	2026-02-05 14:11:55.709
\.


--
-- Data for Name: Reply; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Reply" (id, "ticketId", message, "isAdmin", "createdAt") FROM stdin;
4b0d19b4-a009-4ef5-b92f-65aaffd31f89	ec82be03-655b-40b9-aecb-42224a114d7f	reply please	f	2026-01-09 15:05:58.565
6313d19e-fff9-4431-b268-3a5e118244e3	c283a319-d7b7-4275-9d0a-42c934616d8f	okay beta	t	2026-01-09 16:03:31.547
b3131ab0-70be-4fff-a969-22867550d337	21924869-76cb-4812-8787-5e7590e361b8	ok. we will keep you updated	t	2026-01-10 15:21:29.309
a74666e1-06dd-4f7d-9bae-6e4eca7090aa	4040d162-bcc1-4454-a8f9-372d2985a276	TKT-8XVW7T\n	t	2026-01-15 14:07:29.645
b76bd550-e1d2-4015-9dd6-71f143730e64	4040d162-bcc1-4454-a8f9-372d2985a276	hi	t	2026-01-22 09:14:50.977
46ae93ea-8621-441d-a022-e4cdf62701bd	4040d162-bcc1-4454-a8f9-372d2985a276	how area ya\n	t	2026-01-22 09:15:44.859
\.


--
-- Data for Name: SubscriptionRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SubscriptionRequest" (id, "packageId", "fullName", email, "phoneNumber", "verificationToken", "isEmailVerified", "verifiedAt", "pdfSentAt", "expiresAt", "createdAt", "updatedAt") FROM stdin;
0288f0ef-7b8a-450c-9173-6cb95dd687f2	ac84fddb-f536-49e2-992f-261efdbe2074	umair	umair@gmail.com	+923333303999	0d4306e7b5091ad0e207a3bc4b021ae645f9e25e8fd100dc2c73f584ca85a79d	f	\N	\N	2026-01-09 17:18:45.62	2026-01-09 16:18:45.622	2026-01-09 16:18:45.622
5a3fd53c-196b-4be2-a54b-25a0df12320b	ac84fddb-f536-49e2-992f-261efdbe2074	umair	umair@gmail.com	+923333303999	fe735b8bc8dde581f53349b9665552f580d0f9be6a13d46007febf6522bbc9fb	f	\N	\N	2026-01-09 17:19:06.675	2026-01-09 16:19:06.676	2026-01-09 16:19:06.676
a11eefbe-42df-4b81-893e-c54433af60a6	ac84fddb-f536-49e2-992f-261efdbe2074	umair	awanh1529@gmail.com	+923105710500	cf2a015d4439866c872a8c79fa987f2056b14f7ab53c5276d9d79dde8f34ca69	f	\N	\N	2026-01-09 17:19:55.991	2026-01-09 16:19:55.992	2026-01-09 16:19:55.992
cca9d9a1-c913-4b4e-a3df-bb56839734d4	ac84fddb-f536-49e2-992f-261efdbe2074	umair	awanh1529@gmail.com	+923105710500	e82f4e629008c994b703e6180b8edc1c9103c442d7c2a30588e94e1741021ea2	f	\N	\N	2026-01-09 17:20:17.044	2026-01-09 16:20:17.051	2026-01-09 16:20:17.051
3a90d3b2-cc91-4bd4-88a0-5dbaf045af07	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	44682c8163d10280d2db4b5efa135a96a5d7194aa47e1cbb0cf9f51f375141ff	f	\N	\N	2026-01-09 17:21:09.472	2026-01-09 16:21:09.475	2026-01-09 16:21:09.475
4d524c71-d828-4878-bfdb-55b903acf3d7	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	34b7214f3d97fe7afd4a7a6a60777546ccd229d10af649e9e7baaf489163ed4d	f	\N	\N	2026-01-09 17:21:29.964	2026-01-09 16:21:29.965	2026-01-09 16:21:29.965
d158f0d6-dfdd-46b9-a8d1-e075636e4cc0	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	6617922875b8aea787f52db837e0ee38682669bbcc73b0f4d476d0ae2ed7f244	f	\N	\N	2026-01-09 17:21:52	2026-01-09 16:21:52.002	2026-01-09 16:21:52.002
1f53d75d-8232-4319-9f35-37035e2b7f98	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	30f9dd327be051702c5e57acf34267b242c231f05508c102808a6592af61997a	f	\N	\N	2026-01-09 17:22:15.996	2026-01-09 16:22:15.997	2026-01-09 16:22:15.997
851ed15c-91cd-496c-b95e-ecffe2fc1ef9	ac84fddb-f536-49e2-992f-261efdbe2074	Adnan Bin Khawar	umairusman355248@gmail.com	+923333303999	64c67d387526863b9153573a195049f2826fe7e8a89dd556621d1aecf4049d85	f	\N	\N	2026-01-09 17:24:32.05	2026-01-09 16:24:32.052	2026-01-09 16:24:32.052
e8fc9968-223b-4f39-9783-c3b6c1ad3745	ac84fddb-f536-49e2-992f-261efdbe2074	Adnan Bin Khawar	umairusman355248@gmail.com	+923333303999	384885f24621ec5ed62a4cfeffec94b5d345a3c0db819afb33a5bb98e74f5110	f	\N	\N	2026-01-09 17:24:53.558	2026-01-09 16:24:53.56	2026-01-09 16:24:53.56
dd3d8f81-97e2-4fbb-b95a-c0fc12f01dcb	ac84fddb-f536-49e2-992f-261efdbe2074	Adnan Bin Khawar	umairusman355248@gmail.com	+923333303999	9b5d9820421dbc223d246d2caac28c37349451cbb739a72f4be74e92eeed2505	f	\N	\N	2026-01-09 17:25:17.642	2026-01-09 16:25:17.645	2026-01-09 16:25:17.645
d2877827-dc75-4b5d-b1b2-c15aceceb9a0	ac84fddb-f536-49e2-992f-261efdbe2074	Adnan Bin Khawar	umairusman355248@gmail.com	+923333303999	0a79fb26f90e8dc49a5ffabe324de0755e027562dfffb9ccfbd147be1bcd779e	f	\N	\N	2026-01-09 17:25:42.938	2026-01-09 16:25:42.943	2026-01-09 16:25:42.943
d9af5391-620f-4b61-a7c2-6dc74339f48f	ac84fddb-f536-49e2-992f-261efdbe2074	Umair	umairusman355248@gmail.com	03249645266	2a2e97c92775b3e098ca70942e7385f73245376903183734f503540757612be8	f	\N	\N	2026-01-09 19:21:35.458	2026-01-09 18:21:35.462	2026-01-09 18:21:35.462
66f5206d-ecb9-427b-bfb4-f4ee97ca958c	ac84fddb-f536-49e2-992f-261efdbe2074	Umair	umairusman355248@gmail.com	03249645266	9272072bcadfa2db6fc65608b173dd1fe9b3a7b620f84dc10a318b56ea741987	f	\N	\N	2026-01-09 19:21:56.453	2026-01-09 18:21:56.456	2026-01-09 18:21:56.456
485ad824-7b2f-4bae-bea0-a9e64ce00d0e	ac84fddb-f536-49e2-992f-261efdbe2074	sexa	umairusman355248@gmail.com	+923008111695	845bd77ac353c42ddf20dfba777e70589c69d5733c66d8faaccd4752c5ce4f9f	f	\N	\N	2026-01-10 11:08:06.706	2026-01-10 10:08:06.708	2026-01-10 10:08:06.708
a5b69182-b7bc-444b-9c11-7167da414338	ac84fddb-f536-49e2-992f-261efdbe2074	sexa	umairusman355248@gmail.com	+923008111695	71f4d27d96df60e5edd5addf3fce707461826bca70349915a5ccff0172b271ab	f	\N	\N	2026-01-10 11:08:29.164	2026-01-10 10:08:29.165	2026-01-10 10:08:29.165
0a8deb36-40b6-4795-a91b-02b0a56a7100	ac84fddb-f536-49e2-992f-261efdbe2074	sexa	umairusman355248@gmail.com	+923008111695	12a16da32b20dce33daf0575a887d1b522b0a9aa03a88a3bb92aac95ae431330	f	\N	\N	2026-01-10 11:08:52.181	2026-01-10 10:08:52.185	2026-01-10 10:08:52.185
14d4e044-93f3-458f-9385-80e8f49de6a4	ac84fddb-f536-49e2-992f-261efdbe2074	sexa	umairusman355248@gmail.com	+923008111695	2261b29aaa5880bf64b763ffacec6ed33e31edd0fd8732419f9960a30b8b3939	f	\N	\N	2026-01-10 11:09:16.183	2026-01-10 10:09:16.185	2026-01-10 10:09:16.185
94952adb-5a09-443f-8be7-2b4111501976	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	03161594682	594433fcc2a2030b97477d4e63a2e71480fd353009bb878f5568208539779885	f	\N	\N	2026-01-10 14:17:13.297	2026-01-10 13:17:13.3	2026-01-10 13:17:13.3
299db5ed-f1c1-420c-991b-550e6b4dcd9b	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	03161594682	2c5d61fdf1a61e6f6e5b19cabbf63a8e42f9ba0c6ef1e1eeb70fca28aa29ff3b	f	\N	\N	2026-01-10 14:17:34.762	2026-01-10 13:17:34.764	2026-01-10 13:17:34.764
112530bf-64a8-4f98-8c76-0df3049619e1	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	03161594682	d4b660ec4bda4a7c7c939884046ca6a0dd7f42e45485c81117203d6160ac6e63	f	\N	\N	2026-01-10 14:17:57.723	2026-01-10 13:17:57.725	2026-01-10 13:17:57.725
4442ba5b-4166-4355-a477-99162aa7e9b1	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	03161594682	a5893287b0171c122a5e2f1ce880eca7b1b5ff4509c864beaed778d6c07fe742	f	\N	\N	2026-01-10 14:18:24.009	2026-01-10 13:18:24.011	2026-01-10 13:18:24.011
99035b5f-2b60-4019-a3a0-148c72a195d8	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	03161594682	92d2ff66957d2e5cf05a67c81bf9e7995979a4a78dce3b83e71d547d47013911	f	\N	\N	2026-01-10 16:13:01.747	2026-01-10 15:13:01.749	2026-01-10 15:13:01.749
d11a37f3-27be-42d0-a2f9-fb5e659aa237	ac84fddb-f536-49e2-992f-261efdbe2074	umair	umairusman355248@gmail.com	03333303999	442df9ca7f05f7cfae0bd7cd1b3b0c3b4f707e72e2fe52ea818e0a223b77a94c	f	\N	\N	2026-01-10 16:24:00.723	2026-01-10 15:24:00.725	2026-01-10 15:24:00.725
6519d523-a012-43b6-9912-e57991baa0e5	ac84fddb-f536-49e2-992f-261efdbe2074	umair	umairusman355248@gmail.com	03333303999	86195288e5f792a319125865f1f1d6da59a25f464b59282038ccd1b2b3038d2e	f	\N	\N	2026-01-10 16:24:21.671	2026-01-10 15:24:21.674	2026-01-10 15:24:21.674
dd9c525b-b9ee-4e40-b8c7-9fabeac8d032	ac84fddb-f536-49e2-992f-261efdbe2074	umair	umairusman355248@gmail.com	03333303999	a3949fb7d56357a4959b99b28b8d908a3bdc8001019510ed3cd66010c94d04c0	f	\N	\N	2026-01-10 16:24:45.681	2026-01-10 15:24:45.783	2026-01-10 15:24:45.783
7a0b8354-373b-47ff-8b7a-329af09c791d	ac84fddb-f536-49e2-992f-261efdbe2074	umair	umairusman355248@gmail.com	03333303999	552c8c4e37bc475d1d5aa9583196a1de951ab34004efef33040067a2de7c35d1	f	\N	\N	2026-01-10 16:25:11.174	2026-01-10 15:25:11.175	2026-01-10 15:25:11.175
584bfeb8-b22d-4161-84a3-4ded83e3184c	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	+923161594682		f	\N	\N	1970-01-01 00:00:00	2026-01-10 15:47:38.177	2026-01-10 15:45:33.314
f69df7ab-15b5-476f-9c85-3120221b159a	ac84fddb-f536-49e2-992f-261efdbe2074	hamza awan	awanh1529@gmail.com	03161594682	ce1faaefa6ec9f9f458da769ab0c8a6f6e4630f060ecf7a4739a369ad30fbf6f	t	\N	\N	2026-01-10 16:13:23.191	2026-01-10 15:13:23.193	2026-01-10 15:48:20.177
5ced50d7-c3ed-4c9c-81fe-1027d18fe7c6	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	cade2410f5fda1c904b9b8f997592d9c3af06a74deb3b21c4c067d92d5b1e141	f	\N	\N	2026-01-15 15:08:44.07	2026-01-15 14:08:44.078	2026-01-15 14:08:44.078
2cf53599-f412-410e-bac1-9b2d835ef431	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	85cfe8e7acecd66002f0ace87d3c144c9aa25cd35bcd629fee67b147ca2462a8	f	\N	\N	2026-01-15 15:09:05.47	2026-01-15 14:09:05.471	2026-01-15 14:09:05.471
7c9bc29e-e09e-4da9-806b-ddfb4c7d5e3a	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	f24b911eb5aafc429f09918b9ae0c39f11ff737246cebba5a111e9124ec6fbbc	f	\N	\N	2026-01-15 15:09:27.48	2026-01-15 14:09:27.483	2026-01-15 14:09:27.483
a35202c1-8c2c-49dc-9e76-c263321078c1	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	43500300d04679e86124129305b2cfb8f254a45823d27849b6b564cf167fda92	f	\N	\N	2026-01-15 15:09:51.21	2026-01-15 14:09:51.212	2026-01-15 14:09:51.212
d8fbf65f-0682-406d-9d48-ac55dfa6ec62	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	0572d5da3754a7bd7e49c4a5a2bc058c3ac01f4966933b25160ea19aa6ec53e4	f	\N	\N	2026-01-15 15:10:13.813	2026-01-15 14:10:13.816	2026-01-15 14:10:13.816
598f93f9-0f3d-48b3-b6e1-f474b3f12d37	ac84fddb-f536-49e2-992f-261efdbe2074	hamza	awanh1529@gmail.com	+923008111695	dd143c8a1bc19e729544ec20aeb42bf6e8ed9151992ab16c904cf2d0cf694551	f	\N	\N	2026-01-15 15:10:34.9	2026-01-15 14:10:34.903	2026-01-15 14:10:34.903
\.


--
-- Data for Name: SystemAuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SystemAuditLog" (id, "adminId", action, resource, details, "ipAddress", "createdAt") FROM stdin;
049d903f-9e4c-403b-8938-ae32ef348027	b05f64c3-cadf-430e-9948-594997e596f9	UPDATE	AppSettings	{"changes": {"iban": "21212121212211", "bankName": "UBL", "accountTitle": "UBL", "accountNumber": "21212211211212121", "paymentInstructions": ""}, "updated": {"id": "main", "iban": "21212121212211", "bankName": "UBL", "termsUrl": null, "aboutText": null, "updateUrl": null, "updatedAt": "2026-01-10T13:16:30.007Z", "minVersion": "1.0.0", "privacyUrl": null, "forceUpdate": false, "accountTitle": "UBL", "contactEmail": null, "contactPhone": null, "accountNumber": "21212211211212121", "latestVersion": "1.0.0", "maintenanceMsg": null, "maintenanceMode": false, "paymentInstructions": ""}, "original": {"id": "main", "iban": null, "bankName": null, "termsUrl": null, "aboutText": null, "updateUrl": null, "updatedAt": "2026-01-09T18:23:55.627Z", "minVersion": "1.0.0", "privacyUrl": null, "forceUpdate": false, "accountTitle": null, "contactEmail": null, "contactPhone": null, "accountNumber": null, "latestVersion": "1.0.0", "maintenanceMsg": null, "maintenanceMode": false, "paymentInstructions": null}}	::1	2026-01-10 13:16:30.01
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ticket" (id, "ticketNo", name, email, subject, message, status, priority, tags, "firstResponseAt", "resolvedAt", "createdAt", "updatedAt") FROM stdin;
ec82be03-655b-40b9-aecb-42224a114d7f	TKT-P5UKE5	hamza awan	awanh1529@gmail.com	hvvuyguihiouhu	jgugiugugugugugguguugugugu	OPEN	MEDIUM	[]	\N	\N	2026-01-09 15:02:01.339	2026-01-09 15:02:01.339
4040d162-bcc1-4454-a8f9-372d2985a276	TKT-8XVW7T	Malik Rashid	citicablemultan@gmail.com	Request for Software Demo Before Purchase	fgdffdg grgtger gerterrtg ertegtfertg	CLOSED	MEDIUM	[]	2026-01-15 14:07:29.647	2026-01-22 09:16:30.539	2026-01-15 14:07:08.82	2026-01-22 09:16:43.945
251d5e3d-9b56-4378-b397-1d2891a5e7af	TKT-H8S33N	hamza awan	awanh1529@gmail.com	hvvuyguihiouhu	hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhh	IN_PROGRESS	MEDIUM	[]	\N	2026-01-22 09:25:11.699	2026-01-09 15:09:22.847	2026-01-22 09:25:18.323
21924869-76cb-4812-8787-5e7590e361b8	TKT-QXARUM	a	achann771@gmail.com	your service is very slow	helo helo hueyuieuieuuiheiohello plewaedjheu	IN_PROGRESS	MEDIUM	[]	2026-01-10 15:21:29.312	2026-01-15 14:12:36.905	2026-01-10 15:20:47.401	2026-01-22 09:27:30.935
c283a319-d7b7-4275-9d0a-42c934616d8f	TKT-NR52VA	a	achann771@gmail.com	your service is very slow	huuhuhhuhuhuuuhuhuhjjjj	RESOLVED	MEDIUM	[]	2026-01-09 16:03:31.55	2026-01-22 09:27:38.236	2026-01-09 16:02:22.444	2026-01-22 09:27:38.237
a75b9fac-f5a6-49a9-955f-6869b800577d	TKT-WEBDXE	Motive Solutions	adnankhawar.motive@gmail.com	123gfhfghf	sdfsdfghfghfghfhhgfghfghfh	RESOLVED	MEDIUM	[]	\N	2026-02-02 11:33:32.01	2026-02-02 11:32:53.604	2026-02-02 11:33:32.011
\.


--
-- Data for Name: TicketAttachment; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketAttachment" (id, "ticketId", filename, "fileUrl", "fileType", "fileSize", "createdAt") FROM stdin;
8344a7f2-cf0b-4f31-aa0e-75806099ebed	c283a319-d7b7-4275-9d0a-42c934616d8f	WhatsApp Image 2023-01-30 at 23.31.40.jpg	/uploads/1767974542125-fee6dc39-735c-4d51-884d-e33d21b7c093.jpg	image/jpeg	55099	2026-01-09 16:02:22.448
9c801850-163f-4694-87d2-cfa5d2f53175	a75b9fac-f5a6-49a9-955f-6869b800577d	vampire-demon-ai-3840x2160-18340.jpg	/uploads/1770031965372-c8a40aa9-e7ea-4dc5-aae6-016e5651840a.jpg	image/jpeg	3389277	2026-02-02 11:32:53.607
\.


--
-- Data for Name: TicketTemplate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketTemplate" (id, name, content, category, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Name: Portal_displayId_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Portal_displayId_seq"', 1, false);


--
-- Name: ABTest ABTest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ABTest"
    ADD CONSTRAINT "ABTest_pkey" PRIMARY KEY (id);


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (id);


--
-- Name: AnalyticsSnapshot AnalyticsSnapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AnalyticsSnapshot"
    ADD CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY (id);


--
-- Name: Announcement Announcement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Announcement"
    ADD CONSTRAINT "Announcement_pkey" PRIMARY KEY (id);


--
-- Name: AppSettings AppSettings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AppSettings"
    ADD CONSTRAINT "AppSettings_pkey" PRIMARY KEY (id);


--
-- Name: Backup Backup_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Backup"
    ADD CONSTRAINT "Backup_pkey" PRIMARY KEY (id);


--
-- Name: DeviceToken DeviceToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."DeviceToken"
    ADD CONSTRAINT "DeviceToken_pkey" PRIMARY KEY (id);


--
-- Name: FeatureFlag FeatureFlag_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FeatureFlag"
    ADD CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY (id);


--
-- Name: FeatureTemplate FeatureTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."FeatureTemplate"
    ADD CONSTRAINT "FeatureTemplate_pkey" PRIMARY KEY (id);


--
-- Name: MaintenanceWindow MaintenanceWindow_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."MaintenanceWindow"
    ADD CONSTRAINT "MaintenanceWindow_pkey" PRIMARY KEY (id);


--
-- Name: NotificationSegment NotificationSegment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NotificationSegment"
    ADD CONSTRAINT "NotificationSegment_pkey" PRIMARY KEY (id);


--
-- Name: NotificationTemplate NotificationTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."NotificationTemplate"
    ADD CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: PackageAnalytics PackageAnalytics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PackageAnalytics"
    ADD CONSTRAINT "PackageAnalytics_pkey" PRIMARY KEY (id);


--
-- Name: Package Package_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Package"
    ADD CONSTRAINT "Package_pkey" PRIMARY KEY (id);


--
-- Name: Portal Portal_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Portal"
    ADD CONSTRAINT "Portal_pkey" PRIMARY KEY (id);


--
-- Name: PricingTier PricingTier_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PricingTier"
    ADD CONSTRAINT "PricingTier_pkey" PRIMARY KEY (id);


--
-- Name: RefreshToken RefreshToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_pkey" PRIMARY KEY (id);


--
-- Name: Reply Reply_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reply"
    ADD CONSTRAINT "Reply_pkey" PRIMARY KEY (id);


--
-- Name: SubscriptionRequest SubscriptionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SubscriptionRequest"
    ADD CONSTRAINT "SubscriptionRequest_pkey" PRIMARY KEY (id);


--
-- Name: SystemAuditLog SystemAuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SystemAuditLog"
    ADD CONSTRAINT "SystemAuditLog_pkey" PRIMARY KEY (id);


--
-- Name: TicketAttachment TicketAttachment_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketAttachment"
    ADD CONSTRAINT "TicketAttachment_pkey" PRIMARY KEY (id);


--
-- Name: TicketTemplate TicketTemplate_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketTemplate"
    ADD CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: Admin_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Admin_email_key" ON public."Admin" USING btree (email);


--
-- Name: AnalyticsSnapshot_date_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "AnalyticsSnapshot_date_key" ON public."AnalyticsSnapshot" USING btree (date);


--
-- Name: DeviceToken_platform_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "DeviceToken_platform_idx" ON public."DeviceToken" USING btree (platform);


--
-- Name: DeviceToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "DeviceToken_token_key" ON public."DeviceToken" USING btree (token);


--
-- Name: FeatureFlag_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON public."FeatureFlag" USING btree (key);


--
-- Name: Notification_status_scheduledAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_status_scheduledAt_idx" ON public."Notification" USING btree (status, "scheduledAt");


--
-- Name: PackageAnalytics_packageId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "PackageAnalytics_packageId_key" ON public."PackageAnalytics" USING btree ("packageId");


--
-- Name: Portal_displayId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Portal_displayId_key" ON public."Portal" USING btree ("displayId");


--
-- Name: Portal_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Portal_isActive_idx" ON public."Portal" USING btree ("isActive");


--
-- Name: RefreshToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "RefreshToken_token_key" ON public."RefreshToken" USING btree (token);


--
-- Name: SubscriptionRequest_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SubscriptionRequest_email_idx" ON public."SubscriptionRequest" USING btree (email);


--
-- Name: SubscriptionRequest_expiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SubscriptionRequest_expiresAt_idx" ON public."SubscriptionRequest" USING btree ("expiresAt");


--
-- Name: SubscriptionRequest_verificationToken_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SubscriptionRequest_verificationToken_idx" ON public."SubscriptionRequest" USING btree ("verificationToken");


--
-- Name: SubscriptionRequest_verificationToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SubscriptionRequest_verificationToken_key" ON public."SubscriptionRequest" USING btree ("verificationToken");


--
-- Name: Ticket_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_status_idx" ON public."Ticket" USING btree (status);


--
-- Name: Ticket_ticketNo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Ticket_ticketNo_key" ON public."Ticket" USING btree ("ticketNo");


--
-- Name: Notification Notification_abTestId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_abTestId_fkey" FOREIGN KEY ("abTestId") REFERENCES public."ABTest"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_segmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES public."NotificationSegment"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public."NotificationTemplate"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PackageAnalytics PackageAnalytics_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PackageAnalytics"
    ADD CONSTRAINT "PackageAnalytics_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."Package"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: PricingTier PricingTier_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PricingTier"
    ADD CONSTRAINT "PricingTier_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."Package"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: RefreshToken RefreshToken_adminId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."RefreshToken"
    ADD CONSTRAINT "RefreshToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES public."Admin"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Reply Reply_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Reply"
    ADD CONSTRAINT "Reply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SubscriptionRequest SubscriptionRequest_packageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SubscriptionRequest"
    ADD CONSTRAINT "SubscriptionRequest_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES public."Package"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketAttachment TicketAttachment_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketAttachment"
    ADD CONSTRAINT "TicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict ZJ7izzjqY31w58zsrZUiKuLealJhn5sFPfCB2R90qBgDWoDpZ29k8vvnKUxIbxi

