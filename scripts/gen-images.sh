#!/bin/bash
# Sequential image generation with retries to avoid 429 rate limits
cd /home/z/my-project/public/images

gen() {
  local prompt="$1"
  local out="$2"
  local size="${3:-1024x1024}"
  for i in 1 2 3 4 5; do
    echo ">>> [$out] attempt $i"
    timeout 120 z-ai image -p "$prompt" -o "./$out" -s "$size" && return 0
    sleep 15
  done
  echo "!!! FAILED: $out"
}

gen "Portrait headshot of an elderly wise American businessman in his 90s, wearing dark gray suit with tie, warm friendly smile, studio photography, plain soft light-blue background, high quality detailed" "avatar-warren.png"
sleep 8
gen "Portrait headshot of a middle-aged tech entrepreneur man, short brown hair, black casual t-shirt, slight smile, studio photography, plain dark background, high quality detailed" "avatar-elon.png"
sleep 8
gen "Portrait of a young elegant female English teacher with glasses, holding books, warm smile, smart casual outfit, studio photography, plain teal background, high quality" "avatar-alina.png"
sleep 8
gen "Portrait headshot of a young South Asian male teacher, short black hair, trimmed beard, light blue shirt, friendly smile, studio photography, plain light background, high quality" "avatar-noman.png"
sleep 8
gen "Portrait of a young male college student with backpack smiling, casual hoodie, studio photography, plain light background, high quality" "avatar-student.png"
sleep 8
gen "Portrait of a friendly middle-aged mother, warm smile, casual elegant clothes, studio photography, plain warm light background, high quality" "avatar-parent.png"
sleep 8
gen "Vertical poster design for ENGLISH LANGUAGE COURSE, dark navy blue background, elegant woman teacher holding open book, big bold orange and white typography English Language Course, small white price badge RS.3000, orange ribbon accents, modern education advertising flyer, clean professional layout" "course-english.png" 864x1152
sleep 8
gen "Book cover design, deep purple background with big bold yellow typography RICH DAD POOR DAD, silver frame border, silhouette of a confident man in suit with arms crossed, gold bestseller ribbon at top, personal finance book, clean vector style" "book-finance.png" 864x1152
sleep 8
gen "Wide banner photo of a bright modern classroom with whiteboard, wooden desks and chairs, sunlight through windows, education theme, no people, high quality" "cover-classroom.png" 1440x720
sleep 8
gen "Wide banner photo of two businessmen shaking hands at a professional conference event, blurred warm bokeh lights background, corporate atmosphere, high quality" "cover-meeting.png" 1440x720
echo "ALL DONE"
