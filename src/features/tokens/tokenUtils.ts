import type { Play, Token } from "../../app/types";

export const findTokenByKind = (play: Play, kind: Token["kind"]): Token | undefined => {
  return play.tokens.find((token) => token.kind === kind);
};
