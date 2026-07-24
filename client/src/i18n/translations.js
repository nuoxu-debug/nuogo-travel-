export const translations = {
  en: {
    nav: {
      plan: "Plan a trip",
      archive: "My trips",
      signIn: "Sign in",
      register: "Create account",
      signOut: "Sign out"
    },
    landing: {
      eyebrow: "China domestic travel, thoughtfully structured",
      title: "Plan China, your way.",
      subtitle: "Three AI itineraries. One editable route. Local context at every stop.",
      primary: "Build my China trip",
      secondary: "Explore the workflow",
      routeLabel: "Live route preview",
      routeTitle: "Chengdu · 4 days · food focus",
      featuresTitle: "More than a generated list.",
      featuresBody: "Nuogo turns clear preferences into plans you can compare, edit, map, budget, and share.",
      processTitle: "From preference to a plan you own.",
      finalTitle: "Your next China story starts with structure.",
      finalBody: "Built as a final-year computer science prototype with secure AI adapters and a full demo mode."
    },
    auth: {
      welcome: "Welcome back",
      welcomeBody: "Continue shaping your China itinerary.",
      createTitle: "Create your Nuogo account",
      createBody: "Save plans, invite travel partners, and vote together.",
      name: "Full name",
      email: "Email address",
      password: "Password",
      signIn: "Sign in",
      register: "Create account",
      noAccount: "New to Nuogo?",
      hasAccount: "Already have an account?",
      invalidEmail: "Enter a valid email address.",
      passwordRule: "Use at least 8 characters.",
      nameRule: "Enter at least 2 characters.",
      showPassword: "Show password",
      hidePassword: "Hide password",
      demoNote: "Demo mode stores your account only while the server is running."
    },
    common: {
      demo: "Demo mode",
      loading: "Loading",
      retry: "Try again"
    }
  },
  zh: {
    nav: {
      plan: "规划行程",
      archive: "我的行程",
      signIn: "登录",
      register: "创建账户",
      signOut: "退出登录"
    },
    landing: {
      eyebrow: "专注中国境内旅行的结构化规划",
      title: "用你的方式，探索中国。",
      subtitle: "三套AI行程，一条可编辑路线，每一站都有本地洞察。",
      primary: "开始规划中国之旅",
      secondary: "了解规划流程",
      routeLabel: "路线实时预览",
      routeTitle: "成都 · 4天 · 寻味当地",
      featuresTitle: "不只是一份生成清单。",
      featuresBody: "Nuogo把清晰的偏好变成可比较、可编辑、可看地图、可控预算、可协作的行程。",
      processTitle: "从旅行偏好，到真正属于你的计划。",
      finalTitle: "下一段中国故事，从清晰规划开始。",
      finalBody: "计算机科学毕业设计原型，采用安全AI适配器并支持完整演示模式。"
    },
    auth: {
      welcome: "欢迎回来",
      welcomeBody: "继续完善你的中国旅行计划。",
      createTitle: "创建Nuogo账户",
      createBody: "保存行程、邀请旅伴并一起投票。",
      name: "姓名",
      email: "电子邮箱",
      password: "密码",
      signIn: "登录",
      register: "创建账户",
      noAccount: "第一次使用Nuogo？",
      hasAccount: "已有账户？",
      invalidEmail: "请输入有效的电子邮箱。",
      passwordRule: "密码至少需要8个字符。",
      nameRule: "姓名至少需要2个字符。",
      showPassword: "显示密码",
      hidePassword: "隐藏密码",
      demoNote: "演示模式中的账户仅在服务器运行期间保存。"
    },
    common: {
      demo: "演示模式",
      loading: "加载中",
      retry: "重试"
    }
  }
};

export function translate(language, key) {
  return key.split(".").reduce((value, part) => value?.[part], translations[language]) ?? key;
}
