-- This migration does not contain the hardcoded password.
-- It ensures that we don't accidentally recreate the insecure user in the future.
SELECT 1;
