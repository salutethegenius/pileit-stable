"use client";

import { useLayoutEffect, useRef, useState } from "react";
import Slider, { type Settings } from "react-slick";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import type { Creator } from "@/types/content";
import CreatorCard from "./CreatorCard";

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
  /** react-slick's `responsive` only updates on media *changes*, not on first paint — default stayed at 4 on mobile. */
  const [slidesToShow, setSlidesToShow] = useState(1);

  useLayoutEffect(() => {
    if (n === 0) return;
    const update = () => setSlidesToShow(slidesToShowForWidth(window.innerWidth, n));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [n]);

  const slidesToScroll = slidesToShow <= 1 ? 1 : Math.min(2, slidesToShow);

  const settings: Settings = {
    className: "pileit-creator-row-slider",
    speed: 450,
    arrows: false,
    infinite: false,
    slidesToShow,
    slidesToScroll,
  };

  if (n === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, pr: 1 }}
      >
        <Typography component="h2" variant="h6" fontStyle="italic" fontWeight={800}>
          {title}
        </Typography>
        <Stack direction="row" spacing={1}>
          <Typography
            component={Link}
            href="/creators"
            variant="body2"
            sx={{ color: "primary.main", fontWeight: 600, mr: 1 }}
          >
            See All →
          </Typography>
          <IconButton size="small" onClick={() => sliderRef.current?.slickPrev()}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={() => sliderRef.current?.slickNext()}>
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>
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
