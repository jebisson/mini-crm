import React, { createContext, useState, useEffect, useCallback } from "react";
import { useMsal } from "@azure/msal-react";
import { supabase } from "../supabaseClient";

export const UserProfileContext = createContext(null);

export function UserProfileProvider({ children }) {
  const { instance, accounts } = useMsal();
  const account = accounts[0];
  const userEmail = account?.username;

  const [userProfile, setUserProfile] = useState(null);
  const [department, setDepartment] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!account || !userEmail) { setLoading(false); return; }
    setLoading(true);
    try {
      // 1. Acquire Graph token silently
      let graphDept = null;
      try {
        const tokenRes = await instance.acquireTokenSilent({
          scopes: ["User.Read"],
          account,
        });
        const graphRes = await fetch(
          "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,department",
          { headers: { Authorization: `Bearer ${tokenRes.accessToken}` } }
        );
        if (graphRes.ok) {
          const graphData = await graphRes.json();
          graphDept = graphData.department || null;
        }
      } catch {
        // Graph token unavailable — continue without it
      }

      // 2. Check existing profile
      const { data: existingProfile } = await supabase
        .from("user_profiles")
        .select("*, departments(*)")
        .eq("email", userEmail)
        .single();

      // 3. Check if we need to bootstrap first admin
      let roleToAssign = existingProfile?.role ?? null;
      if (!existingProfile) {
        const { count } = await supabase
          .from("user_profiles")
          .select("id", { count: "exact", head: true });
        if (count === 0) roleToAssign = "admin";
        else roleToAssign = "user";
      }

      // 4. Resolve department_id
      let deptId = existingProfile?.department_id ?? null;
      if (graphDept && existingProfile?.department_source !== "manual") {
        const { data: deptRow } = await supabase
          .from("departments")
          .select("id")
          .ilike("name", graphDept)
          .single();
        if (deptRow) deptId = deptRow.id;
      }

      // 5. Upsert profile
      const { data: upserted } = await supabase
        .from("user_profiles")
        .upsert(
          {
            email: userEmail,
            display_name: account.name ?? userEmail,
            role: roleToAssign,
            department_id: deptId,
            last_login: new Date().toISOString(),
          },
          { onConflict: "email", returning: "representation" }
        )
        .select("*, departments(*)")
        .single();

      const profile = upserted ?? existingProfile;
      setUserProfile(profile);
      setDepartment(profile?.departments ?? null);
    } catch (err) {
      console.error("UserProfileContext error:", err);
    } finally {
      setLoading(false);
    }
  }, [account, userEmail, instance]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const role = userProfile?.role ?? "user";
  const isAdmin = role === "admin";
  const isManager = role === "manager" || isAdmin;
  const isUnassigned = !loading && !userProfile?.department_id;

  return (
    <UserProfileContext.Provider
      value={{
        userProfile,
        department,
        role,
        isAdmin,
        isManager,
        isUnassigned,
        loading,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}
