SET check_function_bodies = false;

CREATE TABLE public.bookshelf (
    manga_id integer NOT NULL,
    status text NOT NULL,
    reading_chapter integer,
    user_id text NOT NULL
);
CREATE TABLE public.chapter_images (
    id integer NOT NULL,
    chapter_id integer NOT NULL,
    image_url text NOT NULL,
    language_id integer NOT NULL,
    "order" integer NOT NULL
);
CREATE SEQUENCE public.chapter_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.chapter_images_id_seq OWNED BY public.chapter_images.id;
CREATE TABLE public.chapters (
    id integer NOT NULL,
    manga_id integer NOT NULL,
    title text,
    poster text,
    release_date date,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.chapters_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.chapters_id_seq OWNED BY public.chapters.id;
CREATE TABLE public.creators (
    id integer NOT NULL,
    name text NOT NULL,
    avatar_url text,
    join_date timestamp with time zone,
    bio text,
    social_link text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE SEQUENCE public.creators_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.creators_id_seq OWNED BY public.creators.id;
CREATE TABLE public.languages (
    id integer NOT NULL,
    symbol text NOT NULL,
    description text,
    icon text
);
CREATE SEQUENCE public.languages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.languages_id_seq OWNED BY public.languages.id;
CREATE TABLE public.manga (
    id integer NOT NULL,
    title text NOT NULL,
    poster text,
    banner text,
    description text NOT NULL,
    release_date timestamp with time zone,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE public.manga_creator (
    manga_id integer NOT NULL,
    creator_id integer NOT NULL
);
CREATE SEQUENCE public.manga_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.manga_id_seq OWNED BY public.manga.id;
CREATE TABLE public.manga_tag (
    manga_id integer NOT NULL,
    tag_id integer NOT NULL
);
CREATE TABLE public.social_activities (
    id integer NOT NULL,
    chapter_id integer,
    manga_id integer,
    action_type text NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_id text NOT NULL
);
CREATE SEQUENCE public.social_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.social_activities_id_seq OWNED BY public.social_activities.id;
CREATE TABLE public.tags (
    id integer NOT NULL,
    tag text NOT NULL,
    language_id integer NOT NULL
);
CREATE SEQUENCE public.tags_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;
ALTER TABLE ONLY public.chapter_images ALTER COLUMN id SET DEFAULT nextval('public.chapter_images_id_seq'::regclass);
ALTER TABLE ONLY public.chapters ALTER COLUMN id SET DEFAULT nextval('public.chapters_id_seq'::regclass);
ALTER TABLE ONLY public.creators ALTER COLUMN id SET DEFAULT nextval('public.creators_id_seq'::regclass);
ALTER TABLE ONLY public.languages ALTER COLUMN id SET DEFAULT nextval('public.languages_id_seq'::regclass);
ALTER TABLE ONLY public.manga ALTER COLUMN id SET DEFAULT nextval('public.manga_id_seq'::regclass);
ALTER TABLE ONLY public.social_activities ALTER COLUMN id SET DEFAULT nextval('public.social_activities_id_seq'::regclass);
ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);
ALTER TABLE ONLY public.bookshelf
    ADD CONSTRAINT bookshelf_pkey PRIMARY KEY (manga_id, user_id);
ALTER TABLE ONLY public.chapter_images
    ADD CONSTRAINT chapter_images_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.creators
    ADD CONSTRAINT creators_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.languages
    ADD CONSTRAINT languages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.manga_creator
    ADD CONSTRAINT manga_creator_pkey PRIMARY KEY (manga_id, creator_id);
ALTER TABLE ONLY public.manga
    ADD CONSTRAINT manga_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.manga_tag
    ADD CONSTRAINT manga_tag_pkey PRIMARY KEY (manga_id, tag_id);
ALTER TABLE ONLY public.social_activities
    ADD CONSTRAINT social_activities_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.bookshelf
    ADD CONSTRAINT bookshelf_manga_id_fkey FOREIGN KEY (manga_id) REFERENCES public.manga(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.chapter_images
    ADD CONSTRAINT chapter_images_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.chapter_images
    ADD CONSTRAINT chapter_images_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.chapters
    ADD CONSTRAINT chapters_manga_id_fkey FOREIGN KEY (manga_id) REFERENCES public.manga(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.manga_creator
    ADD CONSTRAINT manga_creator_creator_id_fkey FOREIGN KEY (creator_id) REFERENCES public.creators(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.manga_creator
    ADD CONSTRAINT manga_creator_manga_id_fkey FOREIGN KEY (manga_id) REFERENCES public.manga(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.manga_tag
    ADD CONSTRAINT manga_tag_manga_id_fkey FOREIGN KEY (manga_id) REFERENCES public.manga(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.manga_tag
    ADD CONSTRAINT manga_tag_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.social_activities
    ADD CONSTRAINT social_activities_chapter_id_fkey FOREIGN KEY (chapter_id) REFERENCES public.chapters(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.social_activities
    ADD CONSTRAINT social_activities_manga_id_fkey FOREIGN KEY (manga_id) REFERENCES public.manga(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_language_id_fkey FOREIGN KEY (language_id) REFERENCES public.languages(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
