export async function logActivity(supabase, { userEmail, departmentId, entityType, entityId, action }) {
  await supabase.from('activities').insert({
    user_email: userEmail,
    department_id: departmentId ?? null,
    entity_type: entityType,
    entity_id: entityId ?? null,
    action,
  });
}
