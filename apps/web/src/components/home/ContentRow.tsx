"use client";

import { useRef } from "react";
import Slider, { type Settings } from "react-slick";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import Link from "next/link";
import type { PileItVideo } from "@/types/content";
import VideoItemWithHover from "./VideoItemWithHover";

type Props = {
  title: string;
  seeAllHref?: string;
  videos: PileItVideo[];
};

export default function ContentRow({ title, seeAllHref, videos }: Props) {
  const sliderRef = useRef<Slider>(null);
  const n = videos.length;
  const cap = (max: number) => Math.max(1, Math.min(max, n));
  const settings: Settings = {
    className: "pileit-content-row-slider",
    speed: 450,
    arrows: false,
    infinite: false,
    centerMode: false,
    slidesToShow: cap(4),
    slidesToScroll: Math.min(2, n),
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: cap(3),
          slidesToScroll: Math.min(2, n),
          centerMode: false,
        },
      },
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

  if (videos.length === 0) return null;

  return (
    <Box sx={{ mb: 3, pl: { xs: 2, md: 3 }, pr: { xs: 1, md: 2 } }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1.5, pr: 1 }}
      >
        <Typography component="h2" variant="h6" fontStyle="italic" fontWeight={800}>
          {title}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1}>
          {seeAllHref && (
            <Typography
              component={Link}
              href={seeAllHref}
              variant="body2"
              sx={{ color: "primary.main", fontWeight: 600 }}
            >
              See All →
            </Typography>
          )}
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
        </Stack>
      </Stack>
      <Box sx={{ position: "relative", overflow: "visible" }}>
        <Slider ref={sliderRef} {...settings}>
          {videos.map((v) => (
            <Box key={v.id} sx={{ px: 1 }}>
              <VideoItemWithHover video={v} />
            </Box>
          ))}
        </Slider>
      </Box>
    </Box>
  );
}
