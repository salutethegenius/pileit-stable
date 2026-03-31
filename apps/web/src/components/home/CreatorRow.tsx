"use client";

import { useEffect, useRef, useState } from "react";
import Slider, { type Settings } from "react-slick";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import type { Creator } from "@/types/content";
import CreatorCard from "./CreatorCard";
import SectionHeader from "./SectionHeader";

type Props = { title: string; creators: Creator[] };

function slidesToShowForWidth(width: number, n: number) {
  const cap = (max: number) => Math.max(1, Math.min(max, n));
  if (width < 600) return cap(1);
  if (width < 900) return cap(2);
  if (width < 1200) return cap(3);
  return cap(4);
}

export default function CreatorRow({ title, creators }: Props) {
  const sliderRef = useRef<Slider>(null);
  const n = creators.length;
  const [slidesToShow, setSlidesToShow] = useState<number | null>(null);

  useEffect(() => {
    if (n === 0) return;
    const update = () => setSlidesToShow(slidesToShowForWidth(window.innerWidth, n));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [n]);

  const resolvedSlides = slidesToShow ?? 1;
  const slidesToScroll = resolvedSlides <= 1 ? 1 : Math.min(2, resolvedSlides);

  const settings: Settings = {
    className: "pileit-creator-row-slider",
    speed: 450,
    arrows: false,
    infinite: false,
    slidesToShow: resolvedSlides,
    slidesToScroll,
  };

  if (n === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <SectionHeader
        title={title}
        seeAllHref="/creators"
        endActions={
          <>
            <IconButton size="small" onClick={() => sliderRef.current?.slickPrev()} aria-label="Previous">
              <ChevronLeftIcon />
            </IconButton>
            <IconButton size="small" onClick={() => sliderRef.current?.slickNext()} aria-label="Next">
              <ChevronRightIcon />
            </IconButton>
          </>
        }
      />
      <Slider ref={sliderRef} key={`${slidesToShow}-${n}`} {...settings}>
        {creators.map((c) => (
          <Box key={c.id} sx={{ px: 1, minWidth: 0, overflow: "hidden" }}>
            <CreatorCard creator={c} />
          </Box>
        ))}
      </Slider>
    </Box>
  );
}
