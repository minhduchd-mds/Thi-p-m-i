-- Hỷ Studio v2.3. Apply to existing hy-studio project, keep legacy API and rows.
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS short_code text,
  ADD COLUMN IF NOT EXISTS is_revoked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS cards_short_code_unique
  ON public.cards (short_code) WHERE short_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS cards_active_expiry_idx
  ON public.cards (expires_at) WHERE is_revoked = false;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cards_short_code_format') THEN
    ALTER TABLE public.cards ADD CONSTRAINT cards_short_code_format
      CHECK (short_code IS NULL OR short_code ~ '^HY-[A-HJ-NP-Z2-9]{12}$');
  END IF;
END $$;
