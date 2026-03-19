-- Drop the FK constraint to auth.users so wallet-only users can be created
-- without a corresponding auth.users row, and add gen_random_uuid() default.

-- 1. Drop the FK constraint (name may vary; find and drop it)
DO $$
DECLARE
    _constraint_name TEXT;
BEGIN
    SELECT conname INTO _constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND confrelid = 'auth.users'::regclass;

    IF _constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', _constraint_name);
        RAISE NOTICE 'Dropped FK constraint: %', _constraint_name;
    ELSE
        RAISE NOTICE 'No FK constraint to auth.users found — already dropped';
    END IF;
END $$;

-- 2. Add default UUID generation so inserts don't need to provide an id
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 3. Ensure onechain_address is unique (prevents duplicate user rows)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'users' AND indexname = 'uq_users_onechain_address'
    ) THEN
        ALTER TABLE public.users ADD CONSTRAINT uq_users_onechain_address UNIQUE (onechain_address);
    END IF;
END $$;
