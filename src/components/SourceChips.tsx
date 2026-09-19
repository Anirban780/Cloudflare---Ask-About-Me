/**
 * Interactive source citation chips component for Ask-About-Me.
 * Renders expandable citation badges mapped to verified knowledge base chunks.
 * Defined per SPECS.md §10 and §15 (F-15).
 */

import { useState } from "react";
import type { MatchedCitation } from "../rag/citations";
import { Badge, Surface, Text } from "@cloudflare/kumo";
import {
  CaretDownIcon,
  CaretUpIcon,
  ArrowSquareOutIcon,
  BookBookmarkIcon,
} from "@phosphor-icons/react";

export interface SourceChipsProps {
  /** Matched citation references extracted from the assistant text. */
  citations: MatchedCitation[];
}

const CIRCLE_NUMBERS = ["⓪", "①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"];

/**
 * Returns a clean circle badge symbol for 1-based indices (e.g. ①, ②),
 * falling back to [n] for numbers > 10.
 */
function getCircleBadge(n: number): string {
  return CIRCLE_NUMBERS[n] || `[${n}]`;
}

/**
 * Renders expandable source chips underneath assistant messages, providing
 * transparent citations and verified grounding.
 */
export function SourceChips({ citations }: SourceChipsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filter for valid matched citations only
  const validCitations = citations.filter(
    (c): c is MatchedCitation & { result: NonNullable<MatchedCitation["result"]> } =>
      c.matched && !!c.result
  );

  if (validCitations.length === 0) {
    return null;
  }

  const toggleExpand = (n: number) => {
    setExpandedIndex((prev) => (prev === n ? null : n));
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-kumo-line/60">
      <div className="flex items-center gap-1.5 mb-2">
        <BookBookmarkIcon size={13} className="text-kumo-inactive" />
        <Text size="xs" variant="secondary" bold>
          Sources consulted ({validCitations.length})
        </Text>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {validCitations.map(({ n, result }) => {
          const isExpanded = expandedIndex === n;
          const circle = getCircleBadge(n);

          return (
            <div key={n} className="flex flex-col">
              <button
                type="button"
                onClick={() => toggleExpand(n)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                  isExpanded
                    ? "bg-kumo-control border-amber-500/50 text-kumo-default font-medium shadow-xs"
                    : "bg-kumo-base hover:bg-kumo-control/60 border-kumo-line text-kumo-subtle"
                }`}
                aria-expanded={isExpanded}
                title={`Click to view source snippet for [${n}]`}
              >
                <span className="text-amber-500 font-semibold">{circle}</span>
                <span className="truncate max-w-[200px]">
                  {result.title} › {result.section}
                </span>
                {isExpanded ? (
                  <CaretUpIcon size={12} className="text-kumo-inactive" />
                ) : (
                  <CaretDownIcon size={12} className="text-kumo-inactive" />
                )}
              </button>

              {isExpanded && (
                <div className="w-full mt-2 animate-in fade-in slide-in-from-top-1 duration-150">
                  <Surface className="p-3 rounded-xl border border-kumo-line bg-kumo-base shadow-xs space-y-2 max-w-xl">
                    <div className="flex items-center justify-between gap-2 border-b border-kumo-line pb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <span className="text-amber-500 mr-1">{circle}</span>
                          {result.sourceType}
                        </Badge>
                        <span className="truncate max-w-[240px]">
                          <Text size="xs" bold>
                            {result.title}
                          </Text>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-kumo-inactive font-mono">
                          Score: {(result.score * 100).toFixed(0)}%
                        </span>
                        {result.url && (
                          <a
                            href={result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-amber-500 hover:underline"
                            title="Open external link"
                          >
                            <span>Link</span>
                            <ArrowSquareOutIcon size={11} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-kumo-default bg-kumo-control/50 rounded-lg p-2.5 font-mono whitespace-pre-wrap leading-relaxed border border-kumo-line/40">
                      {result.text}
                    </div>
                  </Surface>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
