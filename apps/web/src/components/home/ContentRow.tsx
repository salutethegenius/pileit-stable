"use client";

import { useEffect, useRef, useState } from "react";
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
  /** Defaults to / when omitted; pass `null` to hide "See all" */
  seeAllHref?: string | null;
  videos: PileItVideo[];
};

function slidesToShowForWidth(width: number, n: number) {
  const cap = (max: number) => Math.max(1, Math.min(max, n));
  if (width < 600) return 1;
  if (width < 900) return cap(2);
  return cap(3);
}

export default function ContentRow({ title, seeAllHref, videos }: Props) {
  const resolvedSeeAllHref = seeAllHref === undefined ? "/" : seeAllHref;
  const sliderRef = useRef<Slider>(null);
  const n = videos.length;

  const [slidesToShow, setSlidesToShow] = useState<number | null>(null);

  useEffect(() => {
    if (n === 0) return;
    const update = () => setSlidesToShow(slidesToShowForWidth(window.innerWidth, n));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [n]);

  const resolvedSlides = slidesToShow ?? 1;
  const slidesToScroll = resolvedSlides <= 1 ? 1 : Math.min(3, resolvedSlides);

  const settings: Settings = {
    className: "pileit-content-row-slider",
    speed: 450,
    arrows: false,
    infinite: false,
    centerMode: false,
    slidesToShow: resolvedSlides,
    slidesToScroll,
  };

  if (videos.length === 0) return null;

  return (
    <Box sx={{ mb: { xs: 1.5, sm: 3 } }}>
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
            <Box key={v.id} sx={{ px: { xs: 0.5, sm: 1 }, pb: 0.5 }}>
              <VideoItemWithHover video={v} />
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
}
