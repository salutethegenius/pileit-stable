"use client";

import { useMemo, useRef } from "react";
import Slider, { type Settings } from "react-slick";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { PileItVideo } from "@/types/content";
import VideoItemWithHover from "./VideoItemWithHover";
import SectionHeader from "./SectionHeader";

type Props = {
  title: string;
  /** Defaults to / when omitted; pass `null` to hide “See all” */
  seeAllHref?: string | null;
  videos: PileItVideo[];
};

export default function ContentRow({ title, seeAllHref, videos }: Props) {
  const resolvedSeeAllHref = seeAllHref === undefined ? “/” : seeAllHref;
  const sliderRef = useRef<Slider>(null);
  const n = videos.length;
  const settings: Settings = useMemo(() => {
    const cap = (max: number) => Math.max(1, Math.min(max, n));
    return {
      className: "pileit-content-row-slider",
      speed: 450,
      arrows: false,
      infinite: false,
      centerMode: false,
      /* YouTube-style: three larger tiles per row on desktop */
      slidesToShow: cap(3),
      slidesToScroll: Math.min(3, n),
      responsive: [
        {
          breakpoint: 900,
          settings: {
            slidesToShow: cap(2),
            slidesToScroll: 1,
            centerMode: false,
          },
        },
        {
          breakpoint: 600,
          settings: { slidesToShow: 1, slidesToScroll: 1, centerMode: false },
        },
      ],
    };
  }, [n]);

  if (videos.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        title={title}
        seeAllHref={resolvedSeeAllHref ?? undefined}
        endActions={
          <>
            <IconButton
              size="small"
              onClick={() => sliderRef.current?.slickPrev()}
              aria-label="Previous"
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => sliderRef.current?.slickNext()}
              aria-label="Next"
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        }
      />
      <Box sx={{ position: "relative", overflow: "hidden" }}>
        <Slider ref={sliderRef} {...settings}>
          {videos.map((v) => (
            <Box key={v.id} sx={{ px: 1, pb: 0.5 }}>
              <VideoItemWithHover video={v} />
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
}
