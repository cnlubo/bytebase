<template>
  <div
    v-if="openAIKey"
    class="w-full flex flex-col"
    :class="[
      !isChatMode && 'px-4 py-2 border-t',
      isChatMode && 'flex-1 overflow-hidden',
    ]"
  >
    <template v-if="isChatMode">
      <ActionBar />
      <ChatView :conversation="selectedConversation" @enter="requestAI" />
    </template>

    <div :class="[isChatMode && 'px-4 py-2']">
      <div v-if="isChatMode">
        <label class="inline-flex items-center gap-x-1">
          <BBCheckbox :value="autoRun" @toggle="autoRun = $event" />
          <span class="textinfolabel">
            {{ $t("plugin.ai.run-automatically") }}
          </span>
        </label>
      </div>
      <PromptInput @focus="tab.editMode = 'CHAT-TO-SQL'" @enter="requestAI" />
    </div>

    <template v-if="isChatMode">
      <HistoryPanel v-if="showHistoryDialog" />
    </template>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive, watch } from "vue";
import { head } from "lodash-es";
import { Axios, AxiosResponse } from "axios";

import { BBCheckbox } from "@/bbkit";
import { useCurrentTab } from "@/store";
import { useConversationStore } from "../store";
import ActionBar from "./ActionBar.vue";
import ChatView from "./ChatView";
import PromptInput from "./PromptInput.vue";
import HistoryPanel from "./HistoryPanel";
import { onConnectionChanged, useAIContext, useCurrentChat } from "../logic";
import { OpenAIMessage, OpenAIResponse } from "../types";

type LocalState = {
  loading: boolean;
};

const state = reactive<LocalState>({
  loading: false,
});

const tab = useCurrentTab();
const store = useConversationStore();
const isChatMode = computed(() => tab.value.editMode === "CHAT-TO-SQL");

const context = useAIContext();
const { events, openAIKey, autoRun, showHistoryDialog } = context;
const {
  list: conversationList,
  ready,
  selected: selectedConversation,
} = useCurrentChat();

const requestAI = async (query: string) => {
  const conversation = selectedConversation.value;
  if (!conversation) return;
  const t = tab.value;

  const { messageList } = conversation;
  if (messageList.length === 0) {
    // For the first message of a conversation,
    // add extra database schema metadata info if possible
    const engineType = context.engineType.value;
    const databaseMetadata = context.databaseMetadata.value;
    const prompts: string[] = [];
    if (engineType) {
      if (databaseMetadata) {
        prompts.push(`### ${engineType} tables, with their properties:`);
      } else {
        prompts.push(`### ${engineType} database`);
      }
    } else {
      if (databaseMetadata) {
        prompts.push(`### Giving a database`);
      }
    }
    if (databaseMetadata) {
      databaseMetadata.schemas.forEach((schema) => {
        schema.tables.forEach((table) => {
          const name = schema.name
            ? `${schema.name}.${table.name}`
            : table.name;
          const columns = table.columns.map((column) => column.name).join(", ");
          prompts.push(`# ${name}(${columns})`);
        });
      });
    }
    prompts.push(`### Write a SQL statement to solve the question below`);
    prompts.push(`### ${query}`);
    const prompt = prompts.join("\n");
    await store.createMessage({
      conversation_id: conversation.id,
      content: query,
      prompt,
      author: "USER",
      error: "",
      status: "DONE",
    });
  } else {
    await store.createMessage({
      conversation_id: conversation.id,
      content: query,
      prompt: query,
      author: "USER",
      error: "",
      status: "DONE",
    });
  }

  const answer = await store.createMessage({
    author: "AI",
    prompt: "SELECT",
    content: "",
    error: "",
    conversation_id: conversation.id,
    status: "LOADING",
  });
  const url = "https://api.openai.com/v1/chat/completions";
  const FINAL_PROMPT = "SELECT";
  const messages: OpenAIMessage[] = [];

  conversation.messageList.forEach((message) => {
    const { author, prompt } = message;
    messages.push({
      role: author === "USER" ? "user" : "assistant",
      content: prompt,
    });
  });
  const body = {
    model: "gpt-3.5-turbo",
    messages,
    temperature: 0,
    stop: ["#", ";"],
    top_p: 1.0,
    frequency_penalty: 0.0,
    presence_penalty: 0.0,
  };
  state.loading = true;
  const axios = new Axios({
    timeout: 20 * 1000,
    responseType: "json",
  });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${openAIKey.value}`,
  };
  try {
    const response: AxiosResponse<string> = await axios.post(
      url,
      JSON.stringify(body),
      {
        headers,
      }
    );

    const data = JSON.parse(response.data) as OpenAIResponse;
    if (data?.error) {
      throw new Error(data.error.message);
    }

    const text = head(data?.choices)?.message.content?.trim();
    if (text) {
      const parts = [text];
      if (!text.startsWith(FINAL_PROMPT)) {
        parts.unshift(FINAL_PROMPT);
      }
      const statement = parts.join(" ").trim();

      answer.content = statement;
      answer.prompt = statement;
    }

    answer.status = "DONE";
  } catch (err) {
    answer.error = String(err);
    answer.status = "FAILED";
  } finally {
    state.loading = false;
    await store.updateMessage(answer);
    if (conversation.id === conversation.id) {
      if (answer.status === "FAILED") {
        context.events.emit("error", answer.error);
      } else {
        if (
          autoRun.value &&
          t.id === tab.value.id &&
          conversation.id === selectedConversation.value?.id
        ) {
          // If the chat is still active, emit 'apply-statement' event
          context.events.emit("apply-statement", {
            statement: answer.content,
            run: autoRun.value,
          });
        }
      }
    }
  }
};

onConnectionChanged(() => {
  showHistoryDialog.value = false;
});

events.on("new-conversation", async () => {
  showHistoryDialog.value = false;
  const c = await store.createConversation({
    name: "",
    ...tab.value.connection,
  });
  selectedConversation.value = c;
});

watch(
  [ready, conversationList],
  async ([ready, list]) => {
    if (ready && list.length === 0) {
      store.createConversation({
        name: "",
        ...tab.value.connection,
      });
    }
  },
  { immediate: true }
);
</script>
