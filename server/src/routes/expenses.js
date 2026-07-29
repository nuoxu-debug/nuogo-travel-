import { Router } from "express";
import { expenseInputSchema } from "@nuogo/shared/schemas";
import { splitEqually, summarizeExpenses } from "../services/expenseSplit.js";
import { getTripAccess, requireTripRole } from "../services/tripAccess.js";

function apiError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function tripAccess(repository, tripId, userId, roles) {
  return requireTripRole(await getTripAccess(repository, tripId, userId), roles);
}

async function validatedExpenseInput(repository, tripId, body) {
  const input = expenseInputSchema.parse(body);
  const activeUserIds = new Set(
    (await repository.listMembers(tripId))
      .filter(({ status }) => status === "active")
      .map(({ userId }) => userId)
  );
  const allUserIds = [input.paidByUserId, ...input.participantUserIds];
  if (allUserIds.some((userId) => !activeUserIds.has(userId))) {
    throw apiError(
      400,
      "EXPENSE_MEMBER_INVALID",
      "The payer and participants must be active members of this trip."
    );
  }
  return input;
}

function requireExpenseOwner(access, expense, userId) {
  if (access.role === "owner" || expense.createdByUserId === userId) return;
  throw apiError(
    403,
    "EXPENSE_CREATOR_REQUIRED",
    "Editors can only change expenses they created."
  );
}

function expenseAudit(action, expense) {
  return {
    action,
    entityType: "expense",
    ...(expense.id ? { entityId: expense.id } : {}),
    summary: {
      description: expense.description,
      amountFen: expense.amountFen
    }
  };
}

export function createExpensesRouter({ repository, authenticate }) {
  const router = Router();

  router.get("/trips/:tripId/expenses", authenticate, async (req, res, next) => {
    try {
      await tripAccess(repository, req.params.tripId, req.user.id, ["viewer"]);
      res.json({ expenses: await repository.listExpenses(req.params.tripId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/trips/:tripId/expenses", authenticate, async (req, res, next) => {
    try {
      const access = await tripAccess(
        repository,
        req.params.tripId,
        req.user.id,
        ["editor"]
      );
      const input = await validatedExpenseInput(repository, access.trip.id, req.body);
      const expense = await repository.createExpense(
        {
          ...input,
          tripId: access.trip.id,
          createdByUserId: req.user.id
        },
        splitEqually(input.amountFen, input.participantUserIds),
        req.user.id,
        expenseAudit("expense.created", input)
      );
      res.status(201).json({ expense });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/trips/:tripId/expenses/:expenseId",
    authenticate,
    async (req, res, next) => {
      try {
        const access = await tripAccess(
          repository,
          req.params.tripId,
          req.user.id,
          ["editor"]
        );
        const current = await repository.getExpense(
          access.trip.id,
          req.params.expenseId
        );
        if (!current) {
          throw apiError(404, "EXPENSE_NOT_FOUND", "Expense was not found.");
        }
        requireExpenseOwner(access, current, req.user.id);
        const input = await validatedExpenseInput(repository, access.trip.id, req.body);
        const expense = await repository.updateExpense(
          current.id,
          input,
          splitEqually(input.amountFen, input.participantUserIds),
          req.user.id,
          expenseAudit("expense.updated", { ...input, id: current.id })
        );
        res.json({ expense });
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/trips/:tripId/expenses/:expenseId",
    authenticate,
    async (req, res, next) => {
      try {
        const access = await tripAccess(
          repository,
          req.params.tripId,
          req.user.id,
          ["editor"]
        );
        const expense = await repository.getExpense(
          access.trip.id,
          req.params.expenseId
        );
        if (!expense) {
          throw apiError(404, "EXPENSE_NOT_FOUND", "Expense was not found.");
        }
        requireExpenseOwner(access, expense, req.user.id);
        await repository.deleteExpense(
          access.trip.id,
          expense.id,
          req.user.id,
          expenseAudit("expense.deleted", expense)
        );
        res.json({ deletedId: expense.id });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get("/trips/:tripId/expense-summary", authenticate, async (req, res, next) => {
    try {
      const access = await tripAccess(
        repository,
        req.params.tripId,
        req.user.id,
        ["viewer"]
      );
      const [members, expenses] = await Promise.all([
        repository.listMembers(access.trip.id),
        repository.listExpenses(access.trip.id)
      ]);
      const referencedUserIds = new Set(expenses.flatMap((expense) => [
        expense.paidByUserId,
        expense.createdByUserId,
        ...expense.participants.map(({ userId }) => userId)
      ]));
      const includedMembers = members.filter(({ status, userId }) =>
        status === "active" || referencedUserIds.has(userId)
      );
      res.json(summarizeExpenses(includedMembers, expenses));
    } catch (error) {
      next(error);
    }
  });

  return router;
}
