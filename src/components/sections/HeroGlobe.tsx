"use client";

import { useEffect, useRef, useState } from 'react';
import type { GlobeInstance } from 'globe.gl';

// Глобусът в героса (globe.gl / three.js): истинска Земя (NASA Blue Marble, релеф и блестящи океани), а
// показаната дестинация е жълта.
// При смяна се завърта до нея и „каца“ (жълта вълна); тогава Hero.tsx разтваря текста от точката.
// Дестинациите се повдигат при посочване и с клик слагат държавата във филтъра на екскурзиите.
// Зарежда се отделно (dynamic import в Hero.tsx) и само на широк екран.
//
// Земята е текстура на сферата (public/globe, от примерите на three-globe — снимки на NASA, свободни за
// ползване). 3D слоят са само петте дестинации — при посочване globe.gl преизчислява тях, не целия свят.

export type GlobePlace = {
  geoName?: string; // името в world-atlas (английски); без него — жълта точка (Сингапур е твърде малък за картата)
  lat: number;
  lng: number;
  label: string;
};

const YELLOW = '#f2c230';
const YELLOW_LIFT = '#ffe17a';
// Пълното завъртане при автоматична смяна идва като spinMs от Hero.tsx; смяна от посетителя — кратко обръщане.
const QUICK_MS = 1000;
// Сферата заема тази част от платното — останалото е място за ореола и повдигнатата държава.
const SPHERE_FILL = 1 / 1.2;
const LIFT = 0.07;
const ACTIVE_ALT = 0.018;
const IDLE_ALT = 0.004;

type Feature = { properties: { name: string } };

export default function HeroGlobe({
  places, active, spin, spinMs, reduced, running, intro, onReady, onLanded, onHoverChange, onSelect,
}: {
  places: GlobePlace[];
  active: number;
  spin: boolean;
  spinMs: number;
  reduced: boolean;
  running: boolean; // false — секцията е извън екрана или табът е скрит: рисуването спира
  intro: { lat: number; lng: number } | null; // откъде тръгва първото завъртане (София)
  onReady: (ok: boolean) => void;
  onLanded: (index: number) => void;
  onHoverChange: (hovering: boolean) => void;
  onSelect: (index: number) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const [visible, setVisible] = useState(false);
  const altitude = useRef(1.76);
  const shownIndex = useRef<number | null>(null);
  const landTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ringTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = useRef<number | null>(null);
  const activeRef = useRef(active);
  activeRef.current = active;
  // Последните колбеци — globe.gl ги пази от създаването, затова минават през ref
  const cb = useRef({ onLanded, onHoverChange, onSelect });
  cb.current = { onLanded, onHoverChange, onSelect };

  const indexOfFeature = (f: object | null) =>
    (f ? places.findIndex(p => p.geoName === (f as Feature).properties.name) : -1);

  // Цветове и височини на дестинациите според активната и посочената. Нови функции при всяка промяна —
  // така globe.gl преизчислява слоя (и анимира височината за polygonsTransitionDuration).
  // Неактивните дестинации са невидими върху сушата (личат само по тънкия жълт контур), но се посочват.
  const paint = () => {
    const g = globeRef.current;
    if (!g) return;
    const state = (i: number) => (i === hovered.current ? 'hover' : i === activeRef.current ? 'active' : 'idle');
    const featureState = (f: object) => state(indexOfFeature(f));
    const pointState = (p: object) => state(places.indexOf(p as GlobePlace));
    g.polygonCapColor(f => ({ hover: YELLOW_LIFT, active: YELLOW, idle: 'rgba(0,0,0,0)' })[featureState(f)])
      .polygonSideColor(f => ({ hover: 'rgba(242,194,48,0.8)', active: 'rgba(242,194,48,0.6)', idle: 'rgba(0,0,0,0)' })[featureState(f)])
      .polygonStrokeColor(f => (featureState(f) === 'idle' ? 'rgba(255,225,122,0.45)' : '#fff3c4'))
      .polygonAltitude(f => ({ hover: LIFT, active: ACTIVE_ALT, idle: IDLE_ALT })[featureState(f)])
      .pointColor(p => ({ hover: YELLOW_LIFT, active: YELLOW, idle: 'rgba(255,225,122,0.7)' })[pointState(p)])
      .pointAltitude(p => ({ hover: LIFT, active: ACTIVE_ALT * 2, idle: IDLE_ALT * 2 })[pointState(p)]);
  };

  function tooltip(label?: string) {
    if (!label) return '';
    return `<div style="font:600 13px/1.2 var(--font-sans),sans-serif;color:#0f172a;background:${YELLOW_LIFT};padding:7px 11px;border-radius:999px;box-shadow:0 6px 20px rgba(0,0,0,.45)">Екскурзии до ${label}</div>`;
  }

  function hover(index: number) {
    const next = index >= 0 ? index : null;
    if (next === hovered.current) return;
    hovered.current = next;
    paint();
    cb.current.onHoverChange(next !== null);
  }

  function select(index: number) {
    if (index >= 0) cb.current.onSelect(index);
  }

  // Кацане: жълта вълна върху дестинацията и сигнал към Hero.tsx за текста.
  function land(index: number) {
    const g = globeRef.current;
    if (!g) return;
    const p = places[index];
    if (!reduced) {
      g.ringsData([{ lat: p.lat, lng: p.lng }]);
      if (ringTimer.current) clearTimeout(ringTimer.current);
      ringTimer.current = setTimeout(() => globeRef.current?.ringsData([]), 1600);
    }
    cb.current.onLanded(index);
  }

  // Създаване. Без WebGL — нищо не се показва и Hero.tsx сменя снимките без глобуса.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    (async () => {
      try {
        const [{ default: Globe }, THREE, topo, world] = await Promise.all([
          import('globe.gl'),
          import('three'),
          import('topojson-client'),
          import('world-atlas/countries-110m.json'),
        ]);
        if (cancelled) return;
        const atlas = (world as unknown as { default?: unknown }).default ?? world;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const countries = (topo.feature(atlas as any, (atlas as any).objects.countries) as unknown as { features: Feature[] }).features;
        const destinations = countries.filter(f => places.some(p => p.geoName === f.properties.name));
        const pointPlaces = places.filter(p => !p.geoName);

        const g = new Globe(host, { rendererConfig: { antialias: true, alpha: true, powerPreference: 'high-performance' } });
        globeRef.current = g;
        const renderer = g.renderer();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        // Височината на камерата, при която сферата заема SPHERE_FILL от платното
        const fov = ((g.camera() as unknown as { fov: number }).fov * Math.PI) / 180;
        altitude.current = 1 / Math.sin(Math.atan(SPHERE_FILL * Math.tan(fov / 2))) - 1;

        const controls = g.controls();
        controls.enableZoom = false;
        controls.enableRotate = false;
        controls.enablePan = false;

        // Земята: цветна снимка, релеф (за светлосенките на планините) и маска на водата (само тя блести)
        const loader = new THREE.TextureLoader();
        const [earth, relief, water] = await Promise.all([
          loader.loadAsync('/globe/earth-blue-marble.webp'),
          loader.loadAsync('/globe/earth-topology.webp'),
          loader.loadAsync('/globe/earth-water.webp'),
        ]);
        if (cancelled) {
          g._destructor();
          return;
        }
        earth.colorSpace = THREE.SRGBColorSpace;
        earth.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

        const start = intro ?? places[active];
        g.backgroundColor('rgba(0,0,0,0)')
          .width(host.offsetWidth)
          .height(host.offsetHeight)
          .globeMaterial(new THREE.MeshPhongMaterial({
            map: earth,
            bumpMap: relief,
            bumpScale: 8,
            specularMap: water,
            specular: new THREE.Color('#7f93ad'),
            shininess: 22,
          }))
          .showAtmosphere(true)
          .atmosphereColor('#8ec5ff')
          .atmosphereAltitude(0.17)
          // Дестинациите — над сушата; показаната е жълта
          .polygonsData(destinations)
          .polygonCapCurvatureResolution(3)
          .polygonsTransitionDuration(reduced ? 0 : 320)
          .polygonLabel(f => tooltip(places[indexOfFeature(f)]?.label))
          .onPolygonHover(f => hover(indexOfFeature(f)))
          .onPolygonClick(f => select(indexOfFeature(f)))
          .pointsData(pointPlaces)
          .pointLat('lat')
          .pointLng('lng')
          .pointRadius(0.9)
          .pointsMerge(false)
          .pointsTransitionDuration(reduced ? 0 : 320)
          .pointLabel(p => tooltip((p as GlobePlace).label))
          .onPointHover(p => hover(p ? places.indexOf(p as GlobePlace) : -1))
          .onPointClick(p => select(places.indexOf(p as GlobePlace)))
          .showPointerCursor((type: string) => type === 'polygon' || type === 'point')
          // Вълната при кацане
          .ringColor(() => (t: number) => `rgba(242,194,48,${(1 - t).toFixed(3)})`)
          .ringMaxRadius(7)
          .ringPropagationSpeed(4)
          .ringRepeatPeriod(650)
          .pointOfView({ lat: start.lat, lng: start.lng, altitude: altitude.current }, 0);
        paint();

        ro = new ResizeObserver(() => g.width(host.offsetWidth).height(host.offsetHeight));
        ro.observe(host);
        setVisible(true);
        onReady(true);
        if (!intro) {
          shownIndex.current = active;
          land(active);
        }
      } catch (e) {
        console.error('[HeroGlobe]', e);
        onReady(false);
      }
    })();

    // Мишката излезе от глобуса рязко — globe.gl невинаги съобщава, че посочването е свършило; без това
    // страната остава повдигната, подсказката виси, а слайдшоуто остава на пауза.
    const onLeave = () => hover(-1);
    host.addEventListener('pointerleave', onLeave);

    return () => {
      cancelled = true;
      host.removeEventListener('pointerleave', onLeave);
      ro?.disconnect();
      if (landTimer.current) clearTimeout(landTimer.current);
      if (ringTimer.current) clearTimeout(ringTimer.current);
      globeRef.current?._destructor();
      globeRef.current = null;
      host.innerHTML = '';
    };
    // Създава се веднъж; промените минават през методите на globe.gl по-долу.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Нова цел: автоматична смяна — най-краткият път плюс едно пълно завъртане; от посетителя — само най-краткият.
  useEffect(() => {
    const g = globeRef.current;
    if (!g || active === shownIndex.current) return;
    const firstFromIntro = shownIndex.current === null;
    shownIndex.current = active;
    paint();
    g.ringsData([]);

    const target = places[active];
    const cur = g.pointOfView();
    const d = ((target.lng - cur.lng + 540) % 360) - 180;
    const fullTurn = spin && !reduced && !firstFromIntro;
    const extra = fullTurn ? (d >= 0 ? 360 : -360) : 0;
    const ms = reduced ? QUICK_MS : spin || firstFromIntro ? spinMs : QUICK_MS;
    g.pointOfView({ lat: target.lat, lng: cur.lng + d + extra, altitude: altitude.current }, ms);

    // Кацането се проверява по това къде е глобусът, а не само по часовника: ако рисуването е забавено
    // (натоварен компютър, скрит таб), текстът и снимката изчакват глобуса да стигне (до ~3 s отгоре).
    const settle = (tries = 0) => {
      const pov = g.pointOfView();
      const off = Math.abs(((pov.lng - target.lng + 540) % 360) - 180) + Math.abs(pov.lat - target.lat);
      if (off > 1.5 && tries < 30) {
        landTimer.current = setTimeout(() => settle(tries + 1), 100);
        return;
      }
      land(active);
    };
    if (landTimer.current) clearTimeout(landTimer.current);
    landTimer.current = setTimeout(() => settle(), ms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, spin, visible]);

  // Рисуването спира, когато героса не се вижда
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    if (running) g.resumeAnimation();
    else g.pauseAnimation();
  }, [running, visible]);

  return (
    <div
      ref={hostRef}
      className={`h-full w-full transition-[opacity,transform] duration-1000 ease-out motion-reduce:transform-none ${visible ? 'scale-100 opacity-100' : 'scale-[0.94] opacity-0'}`}
    />
  );
}
