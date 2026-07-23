import {
  ArticleData,
  CefrLevel,
  ConnectionResult,
  LlmSettings,
  ParseArticleProgress,
  Sentence,
  Word,
} from '../shared/types';

interface ParsedContent {
  sentences: Omit<Sentence, 'id'>[];
  words: Omit<Word, 'id'>[];
}

const buildEndpoint = (baseUrl: string, anthropic: boolean) => {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  if (anthropic) {
    return trimmed.endsWith('/messages') ? trimmed : `${trimmed}/messages`;
  }
  return trimmed.endsWith('/chat/completions')
    ? trimmed
    : `${trimmed}/chat/completions`;
};

const isAnthropicEndpoint = (url: string) =>
  /anthropic\.com|\/messages\/?$/i.test(url);

const extractJsonCandidate = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? raw).trim();
  const start = candidate.indexOf('{');
  if (start < 0) {
    throw new Error('模型没有返回 JSON 对象');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < candidate.length; index += 1) {
    const character = candidate[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
    } else if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) return candidate.slice(start, index + 1);
    }
  }

  return candidate.slice(start);
};

const nextNonWhitespace = (value: string, start: number) => {
  let index = start;
  while (index < value.length && /\s/.test(value[index])) index += 1;
  return { character: value[index], index };
};

const repairCommonJsonMistakes = (candidate: string) => {
  let repaired = '';
  let inString = false;
  let escaped = false;

  for (let index = 0; index < candidate.length; index += 1) {
    const character = candidate[index];
    repaired += character;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
        const next = nextNonWhitespace(candidate, index + 1);
        if (next.character === '"') repaired += ',';
      }
    } else if (character === '"') {
      inString = true;
    } else if (character === ',') {
      const next = nextNonWhitespace(candidate, index + 1);
      if (next.character === '}' || next.character === ']') {
        repaired = repaired.slice(0, -1);
      }
    } else if (character === '}' || character === ']') {
      const next = nextNonWhitespace(candidate, index + 1);
      if (
        next.character === '{' ||
        next.character === '[' ||
        next.character === '"'
      ) {
        repaired += ',';
      }
    }
  }

  return repaired;
};

const validateParsedContent = (parsed: ParsedContent) => {
  if (!Array.isArray(parsed.sentences) || !Array.isArray(parsed.words)) {
    throw new Error('模型返回的数据缺少 sentences 或 words 数组');
  }
  if (
    parsed.sentences.some(
      (item) =>
        !item ||
        typeof item.text !== 'string' ||
        typeof item.ipa !== 'string' ||
        typeof item.translation !== 'string',
    ) ||
    parsed.words.some(
      (item) =>
        !item ||
        typeof item.word !== 'string' ||
        typeof item.ipa !== 'string' ||
        typeof item.meaning !== 'string',
    )
  ) {
    throw new Error('模型返回的数据字段格式不完整');
  }
  return parsed;
};

export const parseJsonResponse = (
  raw: string,
  onLocalRepair?: () => void,
): ParsedContent => {
  const candidate = extractJsonCandidate(raw);
  try {
    return validateParsedContent(JSON.parse(candidate) as ParsedContent);
  } catch (strictError) {
    const repaired = repairCommonJsonMistakes(candidate);
    if (repaired === candidate) throw strictError;
    onLocalRepair?.();
    return validateParsedContent(JSON.parse(repaired) as ParsedContent);
  }
};

const systemPrompt = `你是 Echo 英语精读工具的语言分析器。请只返回严格 JSON，不要 Markdown。
JSON 结构：
{"sentences":[{"text":"英文原句","ipa":"整句 IPA","translation":"自然中文翻译"}],"words":[{"word":"小写词形","ipa":"单词 IPA","meaning":"结合文章语境的简明中文释义","level":"A1"}]}
要求：
1. 保留原文句子顺序和原始文本，不改写；
2. 正确处理缩写、省略号、引号，按语义分句；
3. words 收录所有有学习价值的英文单词并去重，word 使用文章中的基础词形或常见词形；
4. level 仅允许 A1/A2/B1/B2/C1/C2；
5. 输出必须能被 JSON.parse 直接解析。`;

const jsonRepairPrompt = `你是 JSON 格式修复器。用户会提供一段本应为 JSON 的文本。
只修复缺失或多余的逗号、括号、引号和转义字符，不增删或改写数据内容。
只返回修复后的严格 JSON，不要 Markdown，不要解释。`;

interface RequestOptions {
  lightweight?: boolean;
  system?: string;
  maxTokens?: number;
}

const requestModel = async (
  settings: LlmSettings,
  userText: string,
  options: RequestOptions = {},
): Promise<string> => {
  const {
    lightweight = false,
    system = lightweight ? '只回复 OK' : systemPrompt,
    maxTokens = lightweight ? 32 : 8192,
  } = options;
  const anthropic = isAnthropicEndpoint(settings.apiUrl);
  const endpoint = buildEndpoint(settings.apiUrl, anthropic);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    lightweight ? 15_000 : 90_000,
  );
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: anthropic
        ? {
            'content-type': 'application/json',
            'x-api-key': settings.apiKey,
            'anthropic-version': '2023-06-01',
          }
        : {
            'content-type': 'application/json',
            authorization: `Bearer ${settings.apiKey}`,
          },
      body: JSON.stringify(
        anthropic
          ? {
              model: settings.model,
              max_tokens: maxTokens,
              system,
              messages: [{ role: 'user', content: userText }],
            }
          : {
              model: settings.model,
              temperature: 0.1,
              max_tokens: maxTokens,
              messages: [
                {
                  role: 'system',
                  content: system,
                },
                { role: 'user', content: userText },
              ],
            },
      ),
    });
    const payload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      const error = payload.error as { message?: string } | undefined;
      if (response.status === 401 || response.status === 403) {
        throw new Error('鉴权失败，请检查 API Key');
      }
      if (response.status === 404) {
        throw new Error('接口或模型不存在，请检查 API URL 与 Model');
      }
      if (response.status === 429) {
        throw new Error('请求过于频繁或额度不足');
      }
      throw new Error(error?.message || `服务返回 ${response.status}`);
    }
    if (anthropic) {
      const content = payload.content as { text?: string }[] | undefined;
      return content?.[0]?.text ?? '';
    }
    const choices = payload.choices as
      | { message?: { content?: string } }[]
      | undefined;
    return choices?.[0]?.message?.content ?? '';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('连接超时，请检查网络或 API URL');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

export const parseArticleWithLlm = async (
  settings: LlmSettings,
  title: string,
  text: string,
  reportProgress: (progress: ParseArticleProgress) => void = () => {},
): Promise<Pick<ArticleData, 'sentences' | 'words'>> => {
  reportProgress({
    stage: 'requesting',
    message: '模型正在生成分句、音标、翻译和词义',
  });
  const raw = await requestModel(
    settings,
    `文章标题：${title}\n\n请解析以下英文文章：\n${text}`,
  );
  reportProgress({ stage: 'processing', message: '正在校验模型返回的数据' });

  let parsed: ParsedContent;
  try {
    parsed = parseJsonResponse(raw, () =>
      reportProgress({
        stage: 'repairing',
        message: '检测到格式小问题，正在自动补全 JSON',
      }),
    );
  } catch {
    reportProgress({
      stage: 'repairing',
      message: '模型返回格式不完整，正在请求自动修复',
    });
    const candidate = extractJsonCandidate(raw);
    const repairedRaw = await requestModel(
      settings,
      `请修复以下 JSON：\n${candidate}`,
      { system: jsonRepairPrompt },
    );
    try {
      parsed = parseJsonResponse(repairedRaw);
    } catch {
      throw new Error(
        '模型返回的数据格式不完整，Echo 已尝试自动修复但仍无法解析，请重试',
      );
    }
  }

  reportProgress({ stage: 'processing', message: '正在整理文章学习结构' });
  return {
    sentences: parsed.sentences.map((item, index) => ({
      ...item,
      id: `s-${index + 1}`,
    })),
    words: parsed.words.map((item, index) => ({
      ...item,
      level: (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(item.level ?? '')
        ? item.level
        : undefined) as CefrLevel | undefined,
      id: `w-${index + 1}`,
    })),
  };
};

export const testLlmConnection = async (
  settings: LlmSettings,
): Promise<ConnectionResult> => {
  if (!settings.apiUrl || !settings.apiKey || !settings.model) {
    return { ok: false, message: '请完整填写 API URL、API Key 和 Model' };
  }
  const startedAt = Date.now();
  try {
    await requestModel(settings, 'Reply with OK.', { lightweight: true });
    return {
      ok: true,
      message: '连接成功，配置可用',
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '未知连接错误',
      latencyMs: Date.now() - startedAt,
    };
  }
};
