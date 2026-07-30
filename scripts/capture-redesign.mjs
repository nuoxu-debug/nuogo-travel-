import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";
import {
  demoMembers,
  demoTrip
} from "../client/tests/fixtures.js";

const baseUrl = process.env.NUOGO_CAPTURE_URL || "http://localhost:5173";
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const artifactPaths = {
  collaborationDesktop: "artifacts/nuogo-collaboration-drawer-desktop.png",
  collaborationMobile: "artifacts/nuogo-collaboration-sheet-mobile.png",
  expensesDesktop: "artifacts/nuogo-group-expenses-desktop.png",
  expenseDialogMobile: "artifacts/nuogo-expense-dialog-mobile.png"
};

const owner = {
  id: "user-1",
  name: "Chen Yu",
  email: "owner@nuogo.test"
};

function visualTrip() {
  const trip = structuredClone(demoTrip());
  trip.title.zh = "成都美食与文化";

  const activityCopy = [
    {
      name: "锦里古街",
      description: "漫步传统街巷，在茶馆、小吃与手工艺之间感受成都文化。",
      address: "成都市武侯区锦里古街",
      culture: "从街巷格局和传统店铺了解成都生活。",
      food: "可在附近品尝担担面和钟水饺。",
      crowd: "上午到访更从容。",
      visit: "从南入口沿安静支路步行。"
    },
    {
      name: "人民公园",
      description: "在鹤鸣茶社与林荫步道之间体验成都的慢生活。",
      address: "成都市青羊区人民公园",
      culture: "观察本地茶馆文化与城市公共生活。",
      food: "午后可搭配盖碗茶和传统点心。",
      crowd: "避开周末午后高峰。",
      visit: "预留时间在湖边慢走。"
    },
    {
      name: "川味市集",
      description: "集中品尝川味小吃，并认识常见香料和烹饪方式。",
      address: "成都市锦江区川味市集",
      culture: "从食材和调味理解四川饮食文化。",
      food: "先少量点餐，再按喜好加菜。",
      crowd: "傍晚前抵达可减少排队。",
      visit: "从清淡口味开始，逐步尝试辣味。"
    }
  ];

  for (const variant of trip.variants) {
    variant.title.zh = {
      budget: "轻装省钱：成都4日",
      food: "寻味当地：成都4日",
      leisure: "慢享悠游：成都4日"
    }[variant.style];
    variant.summary.zh = "一条紧凑、可协作并兼顾预算的成都路线。";
    variant.highlights.zh = ["茶馆文化", "川味美食"];
    for (const day of variant.days) {
      day.title.zh = "老成都街巷";
      day.activities.forEach((activity, index) => {
        const copy = activityCopy[index];
        activity.name.zh = copy.name;
        activity.description.zh = copy.description;
        activity.address.zh = copy.address;
        activity.transportNote.zh = "地铁后步行，按顺路方向前往下一站。";
        activity.guide.culture.zh = copy.culture;
        activity.guide.food.zh = copy.food;
        activity.guide.crowd.zh = copy.crowd;
        activity.guide.visit.zh = copy.visit;
      });
    }
  }
  return trip;
}

function visualExpenses() {
  return [
    {
      id: "expense-lunch",
      tripId: "trip-1",
      description: "宏村午餐",
      category: "food",
      amountFen: 30000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-1",
      paidByName: "Chen Yu",
      createdByUserId: "user-1",
      createdByName: "Chen Yu",
      note: "Wang Min 未参加此餐",
      participants: [
        { userId: "user-1", name: "Chen Yu", shareFen: 15000 },
        { userId: "user-2", name: "Li Wei", shareFen: 15000 }
      ],
      createdAt: "2026-08-10T06:00:00.000Z",
      updatedAt: "2026-08-10T06:00:00.000Z"
    },
    {
      id: "expense-transfer",
      tripId: "trip-1",
      description: "黄山站接送",
      category: "transportation",
      amountFen: 12000,
      expenseDate: "2026-08-10",
      paidByUserId: "user-2",
      paidByName: "Li Wei",
      createdByUserId: "user-2",
      createdByName: "Li Wei",
      note: "三位同行者共同分摊",
      participants: [
        { userId: "user-1", name: "Chen Yu", shareFen: 4000 },
        { userId: "user-2", name: "Li Wei", shareFen: 4000 },
        { userId: "user-3", name: "Wang Min", shareFen: 4000 }
      ],
      createdAt: "2026-08-10T07:00:00.000Z",
      updatedAt: "2026-08-10T07:00:00.000Z"
    }
  ];
}

const trip = visualTrip();
const members = demoMembers();
const expenses = visualExpenses();
const expenseSummary = {
  totalSpentFen: 42000,
  members: [
    { userId: "user-1", name: "Chen Yu", paidFen: 30000, shareFen: 19000, netFen: 11000 },
    { userId: "user-2", name: "Li Wei", paidFen: 12000, shareFen: 19000, netFen: -7000 },
    { userId: "user-3", name: "Wang Min", paidFen: 0, shareFen: 4000, netFen: -4000 }
  ],
  settlements: [
    {
      fromUserId: "user-2",
      fromName: "Li Wei",
      toUserId: "user-1",
      toName: "Chen Yu",
      amountFen: 7000
    },
    {
      fromUserId: "user-3",
      fromName: "Wang Min",
      toUserId: "user-1",
      toName: "Chen Yu",
      amountFen: 4000
    }
  ]
};

const pendingInvitation = {
  id: "invitation-demo-pending",
  tripId: "trip-1",
  role: "editor",
  status: "pending",
  expiresAt: "2026-08-06T12:00:00.000Z",
  createdAt: "2026-07-30T12:00:00.000Z"
};

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body)
  };
}

async function installApiMocks(page) {
  await page.route(
    /^https?:\/\/(?:localhost|127\.0\.0\.1):(?:5173|8787)\/api(?:\/|$)/,
    async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method();

    if (method === "GET" && path === "/auth/me") {
      return route.fulfill(jsonResponse({ user: owner }));
    }
    if (method === "GET" && path === "/trips/trip-1/members") {
      return route.fulfill(jsonResponse({ members }));
    }
    if (method === "GET" && path === "/trips/trip-1/invitations") {
      return route.fulfill(jsonResponse({ invitations: [pendingInvitation] }));
    }
    if (method === "GET" && path === "/trips/trip-1/expenses") {
      return route.fulfill(jsonResponse({ expenses }));
    }
    if (method === "GET" && path === "/trips/trip-1/expense-summary") {
      return route.fulfill(jsonResponse(expenseSummary));
    }
    if (method === "GET" && path === "/trips/trip-1") {
      return route.fulfill(jsonResponse({
        trip,
        access: { role: "owner", canEdit: true, isOwner: true }
      }));
    }
    return route.fulfill(jsonResponse({
      error: {
        code: "CAPTURE_ROUTE_UNHANDLED",
        message: `Unhandled capture route: ${method} ${path}`
      }
    }, 501));
    }
  );
}

function recordBrowserErrors(page, label, consoleErrors, pageErrors) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push({ page: label, message: message.text() });
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push({ page: label, message: error.message });
  });
}

async function prepareWorkspace(browser, {
  label,
  viewport,
  language = "zh",
  reducedMotion = "no-preference",
  consoleErrors,
  pageErrors
}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion
  });
  const page = await context.newPage();
  recordBrowserErrors(page, label, consoleErrors, pageErrors);
  await installApiMocks(page);
  await page.addInitScript(({ cachedTrip, selectedLanguage }) => {
    localStorage.setItem("nuogo-token", "capture-owner-token");
    localStorage.setItem("nuogo-language", selectedLanguage);
    localStorage.setItem("nuogo-language-default", "zh-v2");
    sessionStorage.setItem(`nuogo-trip-${cachedTrip.id}`, JSON.stringify(cachedTrip));
  }, { cachedTrip: trip, selectedLanguage: language });
  await page.goto(`${baseUrl}/trip/trip-1`, { waitUntil: "domcontentloaded" });
  try {
    await page.getByTestId("workspace-grid").waitFor();
  } catch (error) {
    console.error(JSON.stringify({
      captureFailure: label,
      url: page.url(),
      title: await page.title(),
      bodyText: (await page.locator("body").innerText()).slice(0, 2000),
      consoleErrors: consoleErrors.filter(({ page: pageLabel }) => pageLabel === label),
      pageErrors: pageErrors.filter(({ page: pageLabel }) => pageLabel === label)
    }, null, 2));
    throw error;
  }
  await page.getByTestId("route-map-panel").waitFor();
  await page.waitForTimeout(700);
  return page;
}

async function horizontalOverflow(page) {
  return page.evaluate(() => ({
    document: document.documentElement.scrollWidth > window.innerWidth,
    body: document.body.scrollWidth > window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth
  }));
}

async function focusEvidence(locator) {
  await locator.focus();
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      focused: document.activeElement === element,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
      hasVisibleIndicator: (
        style.outlineStyle !== "none"
        && style.outlineWidth !== "0px"
      ) || style.boxShadow !== "none"
    };
  });
}

async function boxInsideViewport(page, locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  return {
    box,
    inside: Boolean(
      box
      && viewport
      && box.x >= 0
      && box.y >= 0
      && box.x + box.width <= viewport.width
      && box.y + box.height <= viewport.height
    )
  };
}

await mkdir("artifacts", { recursive: true });

const browser = await chromium.launch({ executablePath: chrome, headless: true });
const consoleErrors = [];
const pageErrors = [];
const report = {
  baseUrl,
  viewports: {
    desktop: "1440x900",
    mobile: "390x844"
  },
  screenshots: artifactPaths,
  consoleErrors,
  pageErrors
};

try {
  const desktopDrawer = await prepareWorkspace(browser, {
    label: "desktop collaboration drawer",
    viewport: { width: 1440, height: 900 },
    consoleErrors,
    pageErrors
  });
  const desktopMembersButton = desktopDrawer.getByRole("button", { name: "成员", exact: true });
  await desktopMembersButton.focus();
  await desktopDrawer.keyboard.press("Enter");
  const desktopDrawerDialog = desktopDrawer.getByRole("dialog", { name: "行程成员" });
  await desktopDrawerDialog.waitFor();
  const desktopDrawerClose = desktopDrawer.getByRole("button", { name: "关闭行程成员" });
  report.desktopDrawer = {
    overflow: await horizontalOverflow(desktopDrawer),
    closeAction: await boxInsideViewport(desktopDrawer, desktopDrawerClose),
    focus: await focusEvidence(desktopDrawerClose),
    width: (await desktopDrawerDialog.boundingBox())?.width ?? null
  };
  await desktopDrawer.screenshot({
    path: artifactPaths.collaborationDesktop
  });
  await desktopDrawer.context().close();

  const mobileDrawer = await prepareWorkspace(browser, {
    label: "mobile collaboration sheet",
    viewport: { width: 390, height: 844 },
    consoleErrors,
    pageErrors
  });
  await mobileDrawer.getByRole("button", { name: "成员", exact: true }).click();
  const mobileDrawerDialog = mobileDrawer.getByRole("dialog", { name: "行程成员" });
  await mobileDrawerDialog.waitFor();
  const mobileDrawerClose = mobileDrawer.getByRole("button", { name: "关闭行程成员" });
  report.mobileDrawer = {
    overflow: await horizontalOverflow(mobileDrawer),
    closeAction: await boxInsideViewport(mobileDrawer, mobileDrawerClose),
    width: (await mobileDrawerDialog.boundingBox())?.width ?? null
  };
  await mobileDrawer.screenshot({
    path: artifactPaths.collaborationMobile
  });
  await mobileDrawer.context().close();

  const desktopExpenses = await prepareWorkspace(browser, {
    label: "desktop group expenses",
    viewport: { width: 1440, height: 900 },
    consoleErrors,
    pageErrors
  });
  await desktopExpenses.getByRole("button", { name: "多人费用" }).click();
  const settlementPanel = desktopExpenses.getByTestId("expense-settlement-panel");
  await settlementPanel.waitFor();
  const expenseColumn = settlementPanel.locator("xpath=ancestor::section[1]");
  const settlementBox = await expenseColumn.boundingBox();
  const mapPanel = desktopExpenses.getByTestId("route-map-panel");
  report.desktopExpenses = {
    overflow: await horizontalOverflow(desktopExpenses),
    settlementWidth: settlementBox?.width ?? null,
    ledgerVisible: await desktopExpenses.getByText("费用记录", { exact: true }).isVisible(),
    mapVisible: await mapPanel.isVisible(),
    mapTiles: await desktopExpenses.locator(".leaflet-tile-loaded").count(),
    timelineVisible: await desktopExpenses.getByTestId("activity-jinli-budget").isVisible(),
    guideVisible: await desktopExpenses.getByTestId("guide-panel").isVisible(),
    plannedBudgetControlVisible: await desktopExpenses
      .getByRole("button", { name: "计划预算" })
      .isVisible()
  };
  await desktopExpenses.screenshot({
    path: artifactPaths.expensesDesktop,
    fullPage: true
  });
  await desktopExpenses.context().close();

  const mobileExpenseDialog = await prepareWorkspace(browser, {
    label: "mobile expense dialog",
    viewport: { width: 390, height: 844 },
    consoleErrors,
    pageErrors
  });
  await mobileExpenseDialog.getByRole("button", { name: "多人费用" }).click();
  await mobileExpenseDialog.getByRole("button", { name: "添加费用" }).click();
  const expenseDialog = mobileExpenseDialog.getByRole("dialog", { name: "添加费用" });
  await expenseDialog.waitFor();
  await mobileExpenseDialog.getByLabel("费用说明").fill("宏村午餐");
  await mobileExpenseDialog.getByLabel("金额").fill("300.00");
  await mobileExpenseDialog.getByRole("checkbox", { name: "Wang Min" }).uncheck();
  const amountInput = mobileExpenseDialog.getByLabel("金额");
  await amountInput.scrollIntoViewIfNeeded();
  const amountControl = await boxInsideViewport(mobileExpenseDialog, amountInput);
  const participantGroup = expenseDialog.locator("fieldset");
  await participantGroup.scrollIntoViewIfNeeded();
  report.mobileExpenseDialog = {
    overflow: await horizontalOverflow(mobileExpenseDialog),
    dialogHorizontalOverflow: await expenseDialog.evaluate(
      (element) => element.scrollWidth > element.clientWidth
    ),
    amountControl,
    participantControl: await boxInsideViewport(
      mobileExpenseDialog,
      mobileExpenseDialog.getByRole("checkbox", { name: "Wang Min" })
    ),
    excludedTraveller: !(await mobileExpenseDialog
      .getByRole("checkbox", { name: "Wang Min" })
      .isChecked()),
    splitPreview: await expenseDialog.getByText("每人 ¥150.00").isVisible()
  };
  await mobileExpenseDialog.screenshot({
    path: artifactPaths.expenseDialogMobile
  });
  await mobileExpenseDialog.context().close();

  const english = await prepareWorkspace(browser, {
    label: "English label check",
    viewport: { width: 1440, height: 900 },
    language: "en",
    consoleErrors,
    pageErrors
  });
  report.languageLabels = {
    chinese: {
      members: true,
      plannedBudget: true,
      groupExpenses: true
    },
    english: {
      members: await english.getByRole("button", { name: "Members", exact: true }).isVisible(),
      plannedBudget: await english.getByRole("button", { name: "Planned budget" }).isVisible(),
      groupExpenses: await english.getByRole("button", { name: "Group expenses" }).isVisible()
    }
  };
  await english.context().close();

  const reduced = await prepareWorkspace(browser, {
    label: "reduced motion check",
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    consoleErrors,
    pageErrors
  });
  await reduced.getByRole("button", { name: "成员", exact: true }).click();
  const reducedDrawer = reduced.getByRole("dialog", { name: "行程成员" });
  await reducedDrawer.waitFor();
  report.reducedMotion = {
    drawerAnimations: await reducedDrawer.evaluate(
      (element) => element.getAnimations({ subtree: true }).length
    ),
    mediaQueryMatches: await reduced.evaluate(
      () => matchMedia("(prefers-reduced-motion: reduce)").matches
    )
  };
  await reduced.context().close();

  const failures = [];
  for (const [name, state] of Object.entries({
    desktopDrawer: report.desktopDrawer,
    mobileDrawer: report.mobileDrawer,
    desktopExpenses: report.desktopExpenses,
    mobileExpenseDialog: report.mobileExpenseDialog
  })) {
    if (state.overflow.document || state.overflow.body) {
      failures.push(`${name} has horizontal page overflow`);
    }
  }
  if (!report.desktopDrawer.closeAction.inside || !report.mobileDrawer.closeAction.inside) {
    failures.push("A collaboration close action is outside its viewport");
  }
  if (
    !report.desktopDrawer.focus.focused
    || !report.desktopDrawer.focus.hasVisibleIndicator
  ) {
    failures.push("The collaboration close action lacks a visible keyboard focus indicator");
  }
  if (
    !report.desktopExpenses.settlementWidth
    || Math.abs(report.desktopExpenses.settlementWidth - 310) > 1
  ) {
    failures.push(`Desktop expense settlement column is ${report.desktopExpenses.settlementWidth}px, not 310px`);
  }
  if (
    !report.desktopExpenses.ledgerVisible
    || !report.desktopExpenses.mapVisible
    || !report.desktopExpenses.timelineVisible
    || !report.desktopExpenses.guideVisible
    || !report.desktopExpenses.plannedBudgetControlVisible
  ) {
    failures.push("A preserved workspace panel is not visible");
  }
  if (report.mobileExpenseDialog.dialogHorizontalOverflow) {
    failures.push("The mobile expense dialog has horizontal overflow");
  }
  if (
    !report.mobileExpenseDialog.amountControl.inside
    || !report.mobileExpenseDialog.participantControl.inside
    || !report.mobileExpenseDialog.excludedTraveller
    || !report.mobileExpenseDialog.splitPreview
  ) {
    failures.push("The mobile expense split controls or CNY 150 preview are not fully visible");
  }
  if (Object.values(report.languageLabels.english).some((visible) => !visible)) {
    failures.push("One or more English collaboration labels are missing");
  }
  if (!report.reducedMotion.mediaQueryMatches || report.reducedMotion.drawerAnimations !== 0) {
    failures.push("Reduced-motion mode still exposes collaboration entrance animation");
  }
  if (consoleErrors.length || pageErrors.length) {
    failures.push("Browser console or page errors were recorded");
  }

  report.failures = failures;
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(failures, []);
} finally {
  await browser.close();
}
