// Yo guardo el tiempo de la medalla de oro de cada nivel (en segundos).
// Yo salgo del recorrido verificado por tools/check-levels.mjs: oro = ruta × 1.3 + 1.5, redondeado a medio segundo.
// Yo me regenero con: node tools/check-levels.mjs --medals

export const GOLD = {
  'w0-l0': 3.5, // l_drop
  'w0-l1': 5.5, // l_twins
  'w0-l2': 12, // l_climb
  'w0-l3': 19.5, // l_portal
  'w0-l4': 15, // l_maze
  'w0-l5': 9.5, // l_floor
  'w0-l6': 29, // l_boss_golem
  'w1-l0': 10.5, // l_hollow
  'w1-l1': 11, // l_roots
  'w1-l2': 13, // l_webs
  'w1-l3': 17.5, // l_silk
  'w1-l4': 12, // l_gloom
  'w1-l5': 11.5, // l_glow
  'w1-l6': 14.5, // l_well
  'w1-l7': 21, // l_tunnels
  'w1-l8': 30, // l_dark_maze
  'w1-l9': 15.5, // l_spores
  'w1-l10': 13.5, // l_abyss
  'w1-l11': 25.5, // l_cave_heart
  'w1-l12': 30, // l_boss_spider
  'w2-l0': 11, // l_belts
  'w2-l1': 11, // l_uphill
  'w2-l2': 11.5, // l_flames
  'w2-l3': 10.5, // l_smelter
  'w2-l4': 15.5, // l_rails
  'w2-l5': 18, // l_lift
  'w2-l6': 13.5, // l_crossing
  'w2-l7': 19, // l_assembly
  'w2-l8': 18.5, // l_chimney
  'w2-l9': 20.5, // l_rhythm
  'w2-l10': 17, // l_sawmill
  'w2-l11': 25.5, // l_core
  'w2-l12': 29, // l_boss_furnace
  'w3-l0': 10, // l_ice
  'w3-l1': 12.5, // l_slide
  'w3-l2': 9.5, // l_icicles
  'w3-l3': 12, // l_frost
  'w3-l4': 18.5, // l_wind
  'w3-l5': 15.5, // l_gusts
  'w3-l6': 10, // l_crevasse
  'w3-l7': 18.5, // l_avalanche
  'w3-l8': 12.5, // l_summit
  'w3-l9': 16, // l_blizzard
  'w3-l10': 15.5, // l_cavern
  'w3-l11': 26, // l_peak
  'w3-l12': 21.5, // l_boss_yeti
  'w4-l0': 12.5, // l_flip
  'w4-l1': 13.5, // l_mirror
  'w4-l2': 12.5, // l_switch
  'w4-l3': 11, // l_tempo
  'w4-l4': 17.5, // l_ceiling
  'w4-l5': 17, // l_two_keys
  'w4-l6': 11, // l_orbit
  'w4-l7': 20.5, // l_station
  'w4-l8': 18.5, // l_vortex
  'w4-l9': 16.5, // l_pulse
  'w4-l10': 20, // l_void_maze
  'w4-l11': 25, // l_void_heart
  'w4-l12': 27, // l_boss_eye
};
