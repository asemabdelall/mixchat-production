"use client";

import React from "react";
import Link from "next/link";

interface MentionTextProps {
  content: string;
  className?: string;
}

/**
 * Safely parses plain text and renders @mentions as clickable Next.js links
 * without using dangerouslySetInnerHTML.
 */
export const MentionText: React.FC<MentionTextProps> = ({
  content,
  className = "",
}) => {
  if (!content) return null;

  // Split by mention token regex while preserving matched tokens
  const mentionRegex = /(@[a-zA-Z0-9_]{3,30})/g;
  const parts = content.split(mentionRegex);

  return (
    <span
      dir="auto"
      className={`whitespace-pre-wrap break-words leading-relaxed ${className}`}
    >
      {parts.map((part, index) => {
        if (part.startsWith("@") && part.length > 1) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              href={`/profile/${username}`}
              onClick={(e) => e.stopPropagation()}
              className="text-purple-400 hover:text-purple-300 font-semibold hover:underline transition-colors"
            >
              {part}
            </Link>
          );
        }
        return <React.Fragment key={index}>{part}</React.Fragment>;
      })}
    </span>
  );
};
