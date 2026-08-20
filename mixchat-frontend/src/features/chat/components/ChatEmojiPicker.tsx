"use client";

import EmojiPicker, {
  EmojiStyle,
  SkinTonePickerLocation,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";
import type { CSSProperties } from "react";

interface ChatEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

type EmojiPickerStyle = CSSProperties & Record<`--epr-${string}`, string>;

const pickerStyle: EmojiPickerStyle = {
  "--epr-dark-bg-color": "#0d1220",
  "--epr-dark-picker-border-color": "transparent",
  "--epr-dark-category-label-bg-color": "rgba(13, 18, 32, 0.96)",
  "--epr-dark-search-input-bg-color": "rgba(255, 255, 255, 0.07)",
  "--epr-dark-search-input-bg-color-active": "rgba(255, 255, 255, 0.1)",
  "--epr-dark-highlight-color": "#c4b5fd",
  "--epr-dark-text-color": "rgba(255, 255, 255, 0.78)",
  "--epr-dark-hover-bg-color": "rgba(139, 92, 246, 0.2)",
  "--epr-dark-hover-bg-color-reduced-opacity": "rgba(139, 92, 246, 0.12)",
  "--epr-dark-focus-bg-color": "rgba(139, 92, 246, 0.28)",
  "--epr-dark-category-icon-active-color": "#a78bfa",
  "--epr-dark-emoji-variation-picker-bg-color": "#151b2b",
  "--epr-dark-skin-tone-picker-menu-color": "rgba(21, 27, 43, 0.98)",
  "--epr-picker-border-radius": "22px",
  "--epr-search-input-border-radius": "14px",
  "--epr-search-input-height": "44px",
  "--epr-horizontal-padding": "12px",
  "--epr-emoji-size": "30px",
  "--epr-emoji-padding": "7px",
};

export function ChatEmojiPicker({ onEmojiSelect }: ChatEmojiPickerProps) {
  return (
    <EmojiPicker
      theme={Theme.DARK}
      emojiStyle={EmojiStyle.NATIVE}
      skinTonePickerLocation={SkinTonePickerLocation.SEARCH}
      onEmojiClick={(emojiData: EmojiClickData) =>
        onEmojiSelect(emojiData.emoji)
      }
      width="100%"
      height="min(420px, 52dvh)"
      lazyLoadEmojis
      autoFocusSearch={false}
      searchPlaceholder="Search emojis"
      searchClearButtonLabel="Clear emoji search"
      previewConfig={{ showPreview: false }}
      className="mixchat-emoji-picker"
      style={pickerStyle}
    />
  );
}
