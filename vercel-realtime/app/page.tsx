import { RealtimeChat } from "./components/RealtimeChat";
import { RealtimeChatWithTools } from "./components/RealtimeChatWithTools";
import { RealtimeChatWithRag } from "./components/RealtimeChatWithRag";
import { RealtimeChatWithRagTools } from "./components/RealtimeChatWithRagTools";

export default function Home() {
  return (
    <main style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h1>Hito 5 — Vercel AI SDK Realtime</h1>
      <RealtimeChat providerArg="openai" />
      <RealtimeChat providerArg="gemini" />

      <h1>Hito 6 — Realtime + Tools</h1>
      <RealtimeChatWithTools providerArg="openai" />
      <RealtimeChatWithTools providerArg="gemini" />

      <h1>Hito 7 — Realtime + RAG</h1>
      <RealtimeChatWithRag providerArg="openai" />
      <RealtimeChatWithRag providerArg="gemini" />

      <h1>Hito 8 — Realtime + RAG + Tools</h1>
      <RealtimeChatWithRagTools providerArg="openai" />
      <RealtimeChatWithRagTools providerArg="gemini" />
    </main>
  );
}
