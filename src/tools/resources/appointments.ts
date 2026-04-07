/**
 * Appointments - Calendar appointments and tasks
 * Endpoint: /Appointment
 */

import { z } from "zod";
import { ResourceConfig } from "../resource-factory.js";

export const appointmentsConfig: ResourceConfig = {
  name: "appointments",
  apiPath: "/Appointment",
  description: "appointment",
  readPermission: "Agent, Calendar Read",
  writePermission: "Agent, Calendar Modify / Appointment Modify",
  listParams: {
    showall: z.boolean().optional().describe("Admin override to return all appointments"),
    start_date: z.string().optional().describe("Filter: start date greater than this (ISO date)"),
    end_date: z.string().optional().describe("Filter: end date greater than this (ISO date)"),
    agents: z.string().optional().describe("Comma-separated agent IDs"),
    showholidays: z.boolean().optional().describe("Include holiday appointments"),
    showprojects: z.boolean().optional().describe("Include projects"),
    showchanges: z.boolean().optional().describe("Include change requests"),
    showappointments: z.boolean().optional().describe("Include appointments"),
    showshifts: z.boolean().optional().describe("Include shifts"),
    appointmentsonly: z.boolean().optional().describe("Only return appointments"),
    tasksonly: z.boolean().optional().describe("Only return tasks"),
    hidecompleted: z.boolean().optional().describe("Exclude completed appointments"),
    ticket_id: z.number().int().optional().describe("Filter by ticket ID"),
    includedetails: z.boolean().optional().describe("Include extra objects"),
  },
};
