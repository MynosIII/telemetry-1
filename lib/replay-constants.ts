/** Position chunks are fixed two-minute windows of epoch time, so every viewer asks for the same cacheable URLs. */
export const POSITION_CHUNK_MS = 120_000;
