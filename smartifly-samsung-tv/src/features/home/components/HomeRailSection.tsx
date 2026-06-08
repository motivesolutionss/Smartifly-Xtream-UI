import React, { memo, useCallback, useRef } from "react";
import { Card } from "../../../components/ui/Card";
import type { HomeRail, HomeRailItem } from "../homeTypes";
import styles from "../Home.module.css";

const HOME_VERTICAL_ANCHOR_REM = 15;
const HOME_RAIL_LEFT_INSET_REM = 4;
const HOME_RAIL_RIGHT_INSET_REM = 12;

const getRootFontSizePx = () => {
  const value = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  return Number.isFinite(value) && value > 0 ? value : 16;
};

type HomeRailSectionProps = {
  rail: HomeRail;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  shouldLoadImages: boolean;
  onCardClick: (item: HomeRailItem, categoryName?: string) => void;
  onCardFocus?: () => void;
};

export const HomeRailSection = memo(function HomeRailSection({
  rail,
  scrollContainerRef,
  shouldLoadImages,
  onCardClick,
  onCardFocus,
}: HomeRailSectionProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef(new Map<string, HTMLDivElement>());

  const setCardRef = useCallback((itemId: string, node: HTMLDivElement | null) => {
    if (node) {
      cardRefs.current.set(itemId, node);
    } else {
      cardRefs.current.delete(itemId);
    }
  }, []);

  const handleCardFocus = useCallback(
    (itemId: string, itemIndex: number) => {
      onCardFocus?.();
      const railElement = railRef.current;
      const cardElement = cardRefs.current.get(itemId);
      const scrollContainer = scrollContainerRef.current;
      if (!railElement || !cardElement || !scrollContainer) {
        return;
      }

      const rootFontSize = getRootFontSizePx();
      const verticalAnchorPx = HOME_VERTICAL_ANCHOR_REM * rootFontSize;
      const leftInset = HOME_RAIL_LEFT_INSET_REM * rootFontSize;
      const rightInset = HOME_RAIL_RIGHT_INSET_REM * rootFontSize;

      const railRect = railElement.getBoundingClientRect();
      const scrollRect = scrollContainer.getBoundingClientRect();
      const railTopInContainer = railRect.top - scrollRect.top + scrollContainer.scrollTop;
      const targetScrollTop = Math.max(0, railTopInContainer - verticalAnchorPx);

      if (Math.abs(scrollContainer.scrollTop - targetScrollTop) > 1) {
        scrollContainer.scrollTop = targetScrollTop;
      }

      if (itemIndex === 0) {
        if (railElement.scrollLeft !== 0) {
          railElement.scrollLeft = 0;
        }
        return;
      }

      const viewportWidth = railElement.clientWidth;
      const currentScroll = railElement.scrollLeft;
      const cardLeftInRail = cardElement.offsetLeft;
      const cardWidth = cardElement.offsetWidth;

      if (cardLeftInRail + cardWidth > currentScroll + viewportWidth - rightInset) {
        const nextLeft = cardLeftInRail + cardWidth - viewportWidth + rightInset;
        if (Math.abs(currentScroll - nextLeft) > 1) {
          railElement.scrollLeft = nextLeft;
        }
      } else if (cardLeftInRail < currentScroll + leftInset) {
        const nextLeft = Math.max(0, cardLeftInRail - leftInset);
        if (Math.abs(currentScroll - nextLeft) > 1) {
          railElement.scrollLeft = nextLeft;
        }
      }
    },
    [onCardFocus, scrollContainerRef]
  );

  return (
    <section className={styles.row}>
      <h2 className={styles.rowTitle}>{rail.title}</h2>
      <div ref={railRef} id={`rail-${rail.id}`} className={styles.rail}>
        {rail.items.map((item, itemIndex) => {
          return (
            <Card
              key={`${rail.id}-${item.type}-${item.id}`}
              id={`card-${rail.id}-${item.type}-${item.id}`}
              title={item.title}
              imageUrl={item.imageUrl || item.backdropUrl}
              fallbackImageUrl={
                item.imageUrl && item.backdropUrl && item.imageUrl !== item.backdropUrl
                  ? item.backdropUrl
                  : undefined
              }
              variant={rail.variant || "poster"}
              aspectRatio={
                rail.variant === "live" || rail.variant === "continue" ? "landscape" : undefined
              }
              contentType={item.contentType}
              progressText={item.progressText}
              progress={item.progress}
              className={rail.id === "continue-watching" ? styles.continueCard : undefined}
              containerRef={(node) => setCardRef(item.id, node)}
              shouldLoadImage={shouldLoadImages}
              disableAutoScroll
              onFocus={() => handleCardFocus(item.id, itemIndex)}
              onClick={() => onCardClick(item, rail.title)}
            />
          );
        })}
      </div>
    </section>
  );
});
