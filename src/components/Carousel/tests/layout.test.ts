import assert from 'node:assert/strict';
import test from 'node:test';
import { carouselLayout, type CarouselMeasurement } from '../Carousel.layout';
import { carouselEngine } from '../Carousel.engine';

test('one responsive snapshot resolves band, peek geometry and scroll-controlled drag together', () => {
  const measured: CarouselMeasurement = { breakpoint: 1, width: 1000, gap: 20, slidesPerView: 2 };
  const layout = carouselLayout.resolve(
    {
      orientation: ['horizontal', 'vertical', 'horizontal'],
      drag: [true, true, true],
      scrollBased: true,
      offsetBefore: [0, 12, 0],
      peekStart: [0, 0.5, 0],
      mousewheel: [false, true, false],
    },
    measured,
  );
  assert.equal(layout.orientation, 'vertical');
  assert.equal(layout.offsetBefore, 257);
  assert.equal(layout.offsetAfter, 0);
  assert.equal(layout.drag, false);
  assert.equal(layout.mousewheel, true);
  assert.equal(carouselLayout.same(measured, { ...measured }), true);
  assert.equal(carouselLayout.same(measured, { ...measured, slidesPerView: 'auto' }), false);
});

test('loop projection keeps the logical slides and initial center while short tracks disable navigation', () => {
  const layout = carouselLayout.resolve(
    { loop: true, navigation: 'both', initialSlide: 1 },
    carouselLayout.initial(2),
  );
  const padded = carouselLayout.slides(['a', 'b', 'c'], layout, 2);
  assert.equal(padded.usesPaddedLoop, true);
  assert.equal(padded.loop, false);
  assert.equal(padded.initialSlide, 7);
  assert.equal(padded.showNavigation, true);
  assert.equal(padded.showDots, true);

  const short = carouselLayout.slides(['a', 'b'], layout, 2);
  assert.equal(short.renderedSlides.length, 2);
  assert.equal(short.loop, false);
  assert.equal(short.showNavigation, false);
  assert.equal(short.showDots, false);
  const empty = carouselLayout.slides([], layout, 2);
  assert.equal(empty.initialSlide, 0);
});

test('auto width and native loop preserve edge policy, configured motion times and autoplay choices', () => {
  const measurement = carouselLayout.initial('auto');
  const layout = carouselLayout.resolve(
    { loop: true, mousewheel: true, effect: 'fade' },
    measurement,
  );
  const slides = carouselLayout.slides(['a', 'b', 'c', 'd', 'e'], layout, 'auto');
  const options = carouselEngine.options({
    measurement,
    layout,
    slides,
    speed: 0,
    autoplayDelay: 1234,
    autoplay: { disableOnInteraction: false },
    inertia: 0.75,
  });
  assert.equal(slides.loop, true);
  assert.deepEqual(options.mousewheel, { forceToAxis: true, releaseOnEdges: false });
  assert.equal(options.speed, 0);
  assert.equal(options.slidesPerView, 'auto');
  assert.deepEqual(options.autoplay, {
    delay: 1234,
    disableOnInteraction: false,
    pauseOnMouseEnter: true,
  });
  assert.deepEqual(options.freeMode, {
    enabled: true,
    momentum: true,
    momentumRatio: 0.75,
    sticky: true,
  });
  assert.equal(options.modules.length, 5);
  assert.match(options.noSwipingSelector, /input, textarea, select/);
  assert.equal(options.a11y.enabled, true);
});
