const form = document.querySelector("#complaintForm");
const draftOutput = document.querySelector("#draftOutput");
const reviewList = document.querySelector("#reviewList");
const copyButton = document.querySelector("#copyButton");
const resetButton = document.querySelector("#resetButton");
const sampleButton = document.querySelector("#sampleButton");

const categoryLabels = {
  facility: "시설물 관리",
  hygiene: "위생 및 환경 관리",
  operation: "운영 및 이용 안내",
  parking: "주차 및 교통 관리",
  staff: "직원 응대",
  safety: "안전 관리",
  other: "해당 민원",
};

const toneOpenings = {
  balanced: "귀하께서 문의하신 사항에 대하여 아래와 같이 참고 답변 초안을 작성하였습니다.",
  firm: "귀하께서 제기하신 사항에 대해 담당 부서 검토를 전제로 다음과 같이 안내드립니다.",
  warm: "귀하께서 이용 과정에서 느끼신 불편 사항에 대해 관련 내용을 검토하여 아래와 같이 안내드립니다.",
};

const riskyPhrases = [
  "진심으로 사과",
  "전적으로",
  "명백한 잘못",
  "책임을 통감",
  "과실",
  "배상",
  "보상하겠습니다",
  "잘못을 인정",
];

const personalInfoPatterns = [
  { label: "휴대전화번호 형태", pattern: /01[016789]-?\d{3,4}-?\d{4}/ },
  { label: "주민등록번호 형태", pattern: /\d{6}-?[1-4]\d{6}/ },
  { label: "계좌번호로 보일 수 있는 긴 숫자", pattern: /\d{3,}[-\s]\d{2,}[-\s]\d{4,}/ },
];

function valueOf(id) {
  return document.querySelector(`#${id}`).value.trim();
}

function normalizeText(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function splitItems(text) {
  return normalizeText(text)
    .split(/\n|[;；]/)
    .map((item) => item.replace(/^[\s\-*ㆍ·]+/, "").trim())
    .filter(Boolean);
}

function trimEnding(text) {
  return text.replace(/[.。!?！？\s]+$/g, "").trim();
}

function actionStem(text) {
  return trimEnding(text)
    .replace(/(할 예정입니다|할 예정임|예정입니다|예정임)$/g, "")
    .replace(/(하였습니다|했습니다|합니다|중입니다|입니다)$/g, "")
    .trim();
}

function refineSummary(text, category) {
  const items = splitItems(text);
  if (!items.length) {
    return `귀하께서 제기하신 ${category} 관련 사항은 시설 이용 과정에서의 불편 및 개선 요청으로 이해하였습니다.`;
  }

  const body = items.map(trimEnding).join(", ");
  return `귀하께서는 ${body}에 대한 확인과 개선을 요청하신 것으로 이해하였습니다.`;
}

function refineActions(text) {
  const items = splitItems(text);
  if (!items.length) {
    return "우리 공사에서는 접수된 내용을 바탕으로 필요한 조치 사항을 검토하고, 이용 불편을 줄일 수 있도록 관리에 유의하겠습니다.";
  }

  if (items.length === 1) {
    return `우리 공사에서는 ${actionStem(items[0])} 등 필요한 조치를 검토하여 추진하겠습니다.`;
  }

  const sentences = items.map((item, index) => {
    const ending = index === items.length - 1 ? "추진하겠습니다" : "검토하겠습니다";
    return `${index + 1}. ${actionStem(item)} 사항을 ${ending}.`;
  });

  return sentences.join("\n");
}

function makeDraft(data) {
  const category = categoryLabels[data.category] || categoryLabels.other;
  const titleLine = data.title ? `제목: ${data.title}\n\n` : "";
  const department = data.department || "담당 부서";
  const phone = data.phone || "담당 부서 연락처";
  const summary = refineSummary(data.summary, category);
  const actions = refineActions(data.actions);
  const deadlineText = data.includeDeadline
    ? "\n\n처리기한 내 검토가 필요한 사항은 관계 부서 확인을 거쳐 순차적으로 조치하겠습니다."
    : "";
  const closingText = data.includeClosing
    ? "\n\n앞으로도 이용 환경 개선과 안정적인 시설 운영을 위해 지속적으로 관리하겠습니다."
    : "";

  return `${titleLine}고객님 안녕하세요.
수원도시공사 ${department}입니다.

먼저 우리 공사 시설과 운영에 관심을 가지고 의견을 주셔서 감사드립니다.
${toneOpenings[data.tone]}

귀하의 민원 요지는 다음과 같이 이해하였습니다.
${summary}

이에 따라 우리 공사에서는 다음과 같이 조치하였거나 조치할 예정입니다.
${actions}${deadlineText}${closingText}

추가로 궁금하신 사항은 수원도시공사 ${department}(${phone})로 문의하여 주시면 성실히 안내드리겠습니다.

감사합니다.

※ 본 문안은 담당자 검토 전 참고 초안입니다. 최종 등록 전 사실관계, 관련 규정, 조치 가능 여부 및 내부 검토 절차를 반드시 확인해 주시기 바랍니다.`;
}

function reviewDraft(text, data) {
  const messages = [
    "본 문안은 공식 답변 확정본이 아닌 담당자 검토용 참고 초안입니다.",
    "최종 등록 전 사실관계, 관련 규정, 조치 가능 여부와 담당 부서 기준을 확인해야 합니다.",
    "과실을 단정하는 표현 대신 '검토', '조치 예정', '관리하겠습니다' 중심으로 작성되었습니다.",
  ];

  const foundRisk = riskyPhrases.filter((phrase) => text.includes(phrase));
  if (foundRisk.length) {
    messages.unshift(`주의 표현 확인: ${foundRisk.join(", ")}`);
  }

  const inputText = `${data.title}\n${data.summary}\n${data.actions}`;
  const foundPrivacy = personalInfoPatterns
    .filter((item) => item.pattern.test(inputText))
    .map((item) => item.label);
  if (foundPrivacy.length) {
    messages.unshift(`개인정보 가능성 확인: ${foundPrivacy.join(", ")}. 최종 사용 전 삭제 또는 마스킹해 주세요.`);
  }

  if (!data.actions) {
    messages.push("조치 일자, 예정 시기, 담당 범위를 넣으면 민원인이 이해하기 쉽습니다.");
  }

  if (!data.phone) {
    messages.push("문의처를 실제 담당 연락처로 교체해 주세요.");
  }

  reviewList.innerHTML = messages.map((message) => `<li>${message}</li>`).join("");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const data = {
    title: valueOf("title"),
    department: valueOf("department"),
    phone: valueOf("phone"),
    category: valueOf("category"),
    tone: valueOf("tone"),
    summary: valueOf("summary"),
    actions: valueOf("actions"),
    includeDeadline: document.querySelector("#includeDeadline").checked,
    includeClosing: document.querySelector("#includeClosing").checked,
  };

  const draft = makeDraft(data);
  draftOutput.textContent = draft;
  reviewDraft(draft, data);
});

copyButton.addEventListener("click", async () => {
  const text = draftOutput.textContent.trim();
  if (!text) return;
  await navigator.clipboard.writeText(text);
  copyButton.textContent = "복사됨";
  setTimeout(() => {
    copyButton.textContent = "복사";
  }, 1400);
});

resetButton.addEventListener("click", () => {
  form.reset();
  draftOutput.textContent = "";
  reviewList.innerHTML = "";
});

sampleButton.addEventListener("click", () => {
  document.querySelector("#title").value = "장안구민회관 수영장 타일 위생 관련";
  document.querySelector("#department").value = "장안구민회관";
  document.querySelector("#phone").value = "031-240-3028";
  document.querySelector("#category").value = "hygiene";
  document.querySelector("#tone").value = "balanced";
  document.querySelector("#summary").value =
    "수영장 바닥 타일의 오염 및 변색으로 인해 위생 상태 개선을 요청";
  document.querySelector("#actions").value =
    "확인된 구간 물청소 및 이끼 제거\n이용 불편을 최소화할 수 있는 시기에 수조 내부 청소와 노후·파손 타일 교체 검토\n오염이 심한 부분의 줄눈 보수 추진 예정";
  form.requestSubmit();
});
