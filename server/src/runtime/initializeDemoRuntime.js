import { supportedDestinationIds } from "@nuogo/shared/constants";
import { AuthService } from "../services/authService.js";
import { demoCostReferenceFixtures } from "../services/budget/demoCostReferenceFixtures.js";

export async function initializeDemoRuntime({ repository, config }) {
  if (config.runtimeMode !== "demo") return;

  if (config.travelDataProvider === "demo") {
    for (const destination of supportedDestinationIds) {
      const existingIds = new Set(
        (await repository.listCostReferences(destination)).map(({ id }) => id)
      );
      for (const reference of demoCostReferenceFixtures(destination)) {
        if (!existingIds.has(reference.id)) await repository.upsertCostReference(reference);
      }
    }
  }

  if (!config.demoAdminEmail || !config.demoAdminPassword) return;
  const authService = new AuthService(repository, config.jwtSecret);
  let user = await repository.findUserByEmail(config.demoAdminEmail);
  if (!user) {
    ({ user } = await authService.register({
      name: "Nuogo Demo Administrator",
      email: config.demoAdminEmail,
      password: config.demoAdminPassword
    }));
  }
  await repository.setUserRole(user.id, "admin");
}
