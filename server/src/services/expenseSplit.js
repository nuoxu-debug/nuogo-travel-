function validateAmount(amountFen) {
  if (!Number.isInteger(amountFen) || amountFen <= 0) {
    throw new RangeError("amountFen must be a positive integer");
  }
}

function compareUserIds(left, right) {
  return left.userId < right.userId ? -1 : left.userId > right.userId ? 1 : 0;
}

export function splitEqually(amountFen, participantUserIds) {
  validateAmount(amountFen);
  if (!Array.isArray(participantUserIds) || participantUserIds.length === 0) {
    throw new RangeError("participants must not be empty");
  }

  const userIds = [...new Set(participantUserIds)].sort();
  if (userIds.length === 0) {
    throw new RangeError("participants must not be empty");
  }

  const shareFen = Math.floor(amountFen / userIds.length);
  const remainderFen = amountFen % userIds.length;

  return userIds.map((userId, index) => ({
    userId,
    shareFen: shareFen + (index < remainderFen ? 1 : 0)
  }));
}

export function summarizeExpenses(members, expenses) {
  const balances = new Map(
    members.map(({ userId, name }) => [userId, {
      userId,
      name,
      paidFen: 0,
      shareFen: 0,
      netFen: 0
    }])
  );

  const getBalance = (userId) => {
    if (!balances.has(userId)) {
      balances.set(userId, {
        userId,
        name: userId,
        paidFen: 0,
        shareFen: 0,
        netFen: 0
      });
    }
    return balances.get(userId);
  };

  let totalSpentFen = 0;
  for (const expense of expenses) {
    validateAmount(expense.amountFen);
    if (!Array.isArray(expense.participants) || expense.participants.length === 0) {
      throw new RangeError("participants must not be empty");
    }

    totalSpentFen += expense.amountFen;
    getBalance(expense.paidByUserId).paidFen += expense.amountFen;
    for (const participant of expense.participants) {
      getBalance(participant.userId).shareFen += participant.shareFen;
    }
  }

  const memberBalances = [...balances.values()];
  for (const balance of memberBalances) {
    balance.netFen = balance.paidFen - balance.shareFen;
  }

  const debtors = memberBalances
    .filter(({ netFen }) => netFen < 0)
    .map((balance) => ({ ...balance, remainingFen: -balance.netFen }))
    .sort((left, right) => right.remainingFen - left.remainingFen || compareUserIds(left, right));
  const creditors = memberBalances
    .filter(({ netFen }) => netFen > 0)
    .map((balance) => ({ ...balance, remainingFen: balance.netFen }))
    .sort((left, right) => right.remainingFen - left.remainingFen || compareUserIds(left, right));

  const settlements = [];
  let debtorIndex = 0;
  let creditorIndex = 0;
  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amountFen = Math.min(debtor.remainingFen, creditor.remainingFen);
    settlements.push({
      fromUserId: debtor.userId,
      fromName: debtor.name,
      toUserId: creditor.userId,
      toName: creditor.name,
      amountFen
    });
    debtor.remainingFen -= amountFen;
    creditor.remainingFen -= amountFen;
    if (debtor.remainingFen === 0) debtorIndex += 1;
    if (creditor.remainingFen === 0) creditorIndex += 1;
  }

  return {
    totalSpentFen,
    members: memberBalances,
    settlements
  };
}
