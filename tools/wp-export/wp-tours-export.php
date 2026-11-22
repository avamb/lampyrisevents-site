<?php
// Tours: past-event posts with lampyris_is_tour=1, every translation, plus their child events (cities).
$ids = lx_all_event_ids();
$groups = lx_groups($ids);
$rows = lx_wpml_rows('post_' . LX_CPT);
$children = [];
foreach ($groups as $g) {
    foreach (array_merge([$g['original']], array_values($g['translations'])) as $r) {
        if ($r['tour_id']) $children[$r['tour_id']][] = ['id' => $r['id'], 'lang' => $rows[$r['id']]['lang'] ?? null, 'date_local' => $r['date_local'], 'city' => $r['city'], 'country' => $r['country'], 'venue' => $r['venue'], 'price_from' => $r['price_from'], 'currency' => $r['currency'], 'partner_url' => $r['partner_url'], 'slug' => $r['slug']];
    }
}
$tours = [];
foreach ($groups as $g) {
    if (!$g['original']['is_tour']) continue;
    $g['state'] = lx_is_actual($g['original']) ? 'actual' : 'past';
    $g['city_events'] = [];
    foreach (array_merge([$g['original']], array_values($g['translations'])) as $r) $g['city_events'][$r['id']] = $children[$r['id']] ?? [];
    $g['summary'] = null;
    if (class_exists('Lampyris_Tours')) { try { $g['summary'] = Lampyris_Tours::summary($g['original']['id']); } catch (Throwable $e) { $g['summary_error'] = $e->getMessage(); } }
    $tours[] = $g;
}
usort($tours, fn($a, $b) => strcmp($b['original']['date_local'], $a['original']['date_local']));
$tr = 0; $cities = 0;
foreach ($tours as $t) { $tr += count($t['translations']); foreach ($t['city_events'] as $c) $cities += count($c); }
lx_out(['generated' => gmdate('c'), 'source' => 'wp-tours-export.php',
    'counts' => ['tours' => count($tours), 'translations' => $tr, 'city_event_links' => $cities],
    'groups' => $tours]);
