import { Router } from "express";
import { z } from "zod";
import {
  createInvitationToken,
  hashInvitationToken
} from "../services/invitationTokens.js";
import { getTripAccess, requireTripRole } from "../services/tripAccess.js";

const roleInputSchema = z.object({
  role: z.enum(["editor", "viewer"])
}).strict();

function apiError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function publicInvitation(invitation) {
  const {
    tokenHash: _tokenHash,
    invitedByUserId: _invitedByUserId,
    acceptedByUserId: _acceptedByUserId,
    ...safe
  } = invitation;
  return safe;
}

function invitationStateError(invitation) {
  const expired = invitation.status === "expired"
    || (invitation.status === "pending" && Date.parse(invitation.expiresAt) <= Date.now());
  if (expired) {
    return apiError(410, "INVITATION_EXPIRED", "This invitation has expired.");
  }
  if (invitation.status === "revoked") {
    return apiError(410, "INVITATION_REVOKED", "This invitation was revoked.");
  }
  if (invitation.status === "accepted") {
    return apiError(409, "INVITATION_CONSUMED", "This invitation was already accepted.");
  }
  if (invitation.status === "declined") {
    return apiError(409, "INVITATION_CONSUMED", "This invitation was declined.");
  }
  return undefined;
}

async function loadInvitation(repository, token) {
  const invitation = await repository.getInvitationByTokenHash(hashInvitationToken(token));
  if (!invitation) {
    throw apiError(404, "NOT_FOUND", "Invitation was not found.");
  }
  return invitation;
}

async function ownerAccess(repository, tripId, userId) {
  return requireTripRole(await getTripAccess(repository, tripId, userId), ["owner"]);
}

async function memberAccess(repository, tripId, userId) {
  return requireTripRole(await getTripAccess(repository, tripId, userId), ["viewer"]);
}

async function findMember(repository, tripId, memberId) {
  return (await repository.listMembers(tripId)).find(({ id }) => id === memberId);
}

export function createMembersRouter({ repository, authenticate, clientOrigin }) {
  const router = Router();

  router.post("/trips/:tripId/invitations", authenticate, async (req, res, next) => {
    try {
      const access = await ownerAccess(repository, req.params.tripId, req.user.id);
      const { role } = roleInputSchema.parse(req.body);
      const { token, tokenHash } = createInvitationToken();
      const invitation = await repository.createInvitation({
        tripId: access.trip.id,
        tokenHash,
        role,
        status: "pending",
        invitedByUserId: req.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }, req.user.id, {
        action: "invitation.created",
        entityType: "invitation",
        summary: { role }
      });
      res.status(201).json({
        token,
        url: `${clientOrigin}/invite/${token}`,
        invitation: publicInvitation(invitation)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/trips/:tripId/invitations", authenticate, async (req, res, next) => {
    try {
      await ownerAccess(repository, req.params.tripId, req.user.id);
      const invitations = await repository.listInvitations(req.params.tripId);
      res.json({ invitations: invitations.map(publicInvitation) });
    } catch (error) {
      next(error);
    }
  });

  router.delete(
    "/trips/:tripId/invitations/:invitationId",
    authenticate,
    async (req, res, next) => {
      try {
        await ownerAccess(repository, req.params.tripId, req.user.id);
        const invitation = await repository.updateInvitation(
          req.params.invitationId,
          req.params.tripId,
          { status: "revoked" },
          { expectedStatuses: ["pending"], requireUnexpired: true },
          req.user.id,
          {
            action: "invitation.revoked",
            entityType: "invitation",
            entityId: req.params.invitationId,
            summary: {}
          }
        );
        if (!invitation) {
          const current = (await repository.listInvitations(req.params.tripId))
            .find(({ id }) => id === req.params.invitationId);
          if (!current) throw apiError(404, "NOT_FOUND", "Invitation was not found.");
          throw invitationStateError(current)
            ?? apiError(409, "INVITATION_CONSUMED", "Invitation state has changed.");
        }
        res.json({ invitation: publicInvitation(invitation) });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get("/trips/:tripId/members", authenticate, async (req, res, next) => {
    try {
      await memberAccess(repository, req.params.tripId, req.user.id);
      const members = (await repository.listMembers(req.params.tripId))
        .filter(({ status }) => status === "active");
      res.json({ members });
    } catch (error) {
      next(error);
    }
  });

  router.patch(
    "/trips/:tripId/members/:memberId",
    authenticate,
    async (req, res, next) => {
      try {
        await ownerAccess(repository, req.params.tripId, req.user.id);
        const target = await findMember(repository, req.params.tripId, req.params.memberId);
        if (!target) {
          throw apiError(404, "NOT_FOUND", "Trip member was not found.");
        }
        if (target.role === "owner") {
          throw apiError(409, "TRIP_OWNER_IMMUTABLE", "The trip owner role cannot be changed.");
        }
        const { role } = roleInputSchema.parse(req.body);
        const member = await repository.updateMember(
          req.params.tripId,
          req.params.memberId,
          role,
          req.user.id,
          {
            action: "member.role_changed",
            entityType: "member",
            entityId: target.id,
            summary: { userId: target.userId, role }
          }
        );
        res.json({ member });
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    "/trips/:tripId/members/:memberId",
    authenticate,
    async (req, res, next) => {
      try {
        await ownerAccess(repository, req.params.tripId, req.user.id);
        const target = await findMember(repository, req.params.tripId, req.params.memberId);
        if (!target) {
          throw apiError(404, "NOT_FOUND", "Trip member was not found.");
        }
        if (target.role === "owner") {
          throw apiError(409, "TRIP_OWNER_IMMUTABLE", "The trip owner cannot be removed.");
        }
        const member = await repository.removeMember(
          req.params.tripId,
          req.params.memberId,
          req.user.id,
          {
            action: "member.removed",
            entityType: "member",
            entityId: target.id,
            summary: { userId: target.userId, role: target.role }
          }
        );
        res.json({ member });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get("/trips/:tripId/activity-log", authenticate, async (req, res, next) => {
    try {
      await memberAccess(repository, req.params.tripId, req.user.id);
      res.json({ activities: await repository.listTripActivity(req.params.tripId, 50) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/invitations/:token", async (req, res, next) => {
    try {
      const invitation = await loadInvitation(repository, req.params.token);
      const stateError = invitationStateError(invitation);
      if (stateError) throw stateError;
      const trip = await repository.getTrip(invitation.tripId);
      const owner = trip && await repository.findUserById(trip.ownerId);
      if (!trip || !owner) {
        throw apiError(404, "NOT_FOUND", "Invitation trip was not found.");
      }
      res.json({
        invitation: {
          ...publicInvitation(invitation),
          trip: {
            id: trip.id,
            title: trip.title,
            destination: trip.destination,
            startDate: trip.startDate,
            endDate: trip.endDate
          },
          owner: { name: owner.name }
        }
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/invitations/:token/accept", authenticate, async (req, res, next) => {
    try {
      const invitation = await loadInvitation(repository, req.params.token);
      const stateError = invitationStateError(invitation);
      const isRepeat = invitation.status === "accepted"
        && invitation.acceptedByUserId === req.user.id;
      if (stateError && !isRepeat) throw stateError;
      const trip = await repository.getTrip(invitation.tripId);
      if (trip?.ownerId === req.user.id) {
        throw apiError(
          409,
          "TRIP_OWNER_IMMUTABLE",
          "The trip owner already has owner access."
        );
      }
      const membership = await repository.acceptInvitation(
        invitation.id,
        req.user.id,
        isRepeat ? undefined : {
          action: "member.joined",
          entityType: "member",
          summary: { role: invitation.role }
        }
      );
      if (!membership) {
        const current = await loadInvitation(repository, req.params.token);
        throw invitationStateError(current)
          ?? apiError(409, "INVITATION_CONSUMED", "This invitation was already consumed.");
      }
      res.json({ membership, tripId: invitation.tripId });
    } catch (error) {
      next(error);
    }
  });

  router.post("/invitations/:token/decline", authenticate, async (req, res, next) => {
    try {
      const invitation = await loadInvitation(repository, req.params.token);
      const stateError = invitationStateError(invitation);
      if (stateError) throw stateError;
      const declined = await repository.updateInvitation(invitation.id, invitation.tripId, {
        status: "declined",
        acceptedByUserId: req.user.id,
        acceptedAt: new Date().toISOString()
      }, {
        expectedStatuses: ["pending"],
        requireUnexpired: true
      }, req.user.id, {
        action: "invitation.declined",
        entityType: "invitation",
        entityId: invitation.id,
        summary: { role: invitation.role }
      });
      if (!declined) {
        const current = await loadInvitation(repository, req.params.token);
        throw invitationStateError(current)
          ?? apiError(409, "INVITATION_CONSUMED", "Invitation state has changed.");
      }
      return res.json({ invitation: publicInvitation(declined) });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
