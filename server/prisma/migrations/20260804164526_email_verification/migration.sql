-- AlterTable
-- Nullable, no default: every EXISTING row starts as NULL = unverified, which is
-- the intended retroactive policy. Enforcement is separately gated behind the
-- REQUIRE_EMAIL_VERIFICATION env flag, so applying this migration alone changes
-- no login behaviour.
ALTER TABLE "User" ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3);

-- Grandfather administrators as verified.
--
-- SAFETY: this is the anti-lockout guarantee, and it lives in the migration on
-- purpose. Admins are the one population that cannot recover from being blocked
-- by an undelivered email — losing the admin panel on a live store would be
-- self-inflicted and awkward to undo (it would need direct DB access). Doing it
-- here means it is atomic with the column's creation: there is no window, and no
-- separate script anyone has to remember to run before flipping the flag.
--
-- Scoped to role = 'ADMIN' only. Customers are deliberately left NULL.
UPDATE "User" SET "emailVerifiedAt" = NOW() WHERE "role" = 'ADMIN';

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
