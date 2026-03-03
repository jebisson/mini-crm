import { useContext } from "react";
import { UserProfileContext } from "../contexts/UserProfileContext";

export function useUserProfile() {
  return useContext(UserProfileContext);
}
