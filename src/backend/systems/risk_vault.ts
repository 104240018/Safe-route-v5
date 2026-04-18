/**
 * SYSTEM: Risk Vault
 * RESPONSIBILITY: Data access layer for risk zones persistence.
 * INPUT: Risk zone data, DB connection
 * OUTPUT: Persistence in SQLite
 */

import { db } from "../db.js";

export const RiskVault = {
  getAll: () => {
    const zones = db.prepare("SELECT * FROM risk_zones").all() as any[];
    return zones.map(z => ({
      ...z,
      points: z.points ? JSON.parse(z.points) : [],
      modifiers: z.modifiers ? JSON.parse(z.modifiers) : {}
    }));
  },

  create: (data: any) => {
    const { type, category, name, description, lat, lng, radius, points, base_risk, modifiers } = data;
    const result = db.prepare("INSERT INTO risk_zones (type, category, name, description, lat, lng, radius, points, base_risk, modifiers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
      type, category, name, description, lat, lng, radius, 
      JSON.stringify(points || []), 
      base_risk, 
      JSON.stringify(modifiers || {})
    );
    return { id: result.lastInsertRowid, ...data };
  },

  update: (id: string, data: any) => {
    const { radius, base_risk, modifiers, category, name, description } = data;
    db.prepare("UPDATE risk_zones SET radius = ?, base_risk = ?, modifiers = ?, category = ?, name = ?, description = ? WHERE id = ?").run(
      radius, base_risk, JSON.stringify(modifiers), category, name, description, id
    );
    return { success: true };
  },

  delete: (id: string) => {
    db.prepare("DELETE FROM risk_zones WHERE id = ?").run(id);
    return { success: true };
  },

  deleteAll: () => {
    db.prepare("DELETE FROM risk_zones").run();
    return { success: true };
  }
};
