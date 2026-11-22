<?php
// Upcoming events (tag `actual` on the original), every translation, read only.
// Output: { generated, counts, groups:[{trid, original, translations, sessions}] }.
// Sessions: WP keeps one date per post; a tour's cities are its child events (see wp-tours-export.php).
$ids = lx_all_event_ids();
$groups = lx_groups($ids);
$keep = [];
foreach ($groups as $g) {
    if (!lx_is_actual($g['original'])) continue;
    $o = $g['original'];
    $g['sessions'] = [[
        'start_local' => $o['date_local'],
        'city' => $o['city'], 'country' => $o['country'],
        'venue' => $o['venue'], 'address' => $o['venue_address'],
        'price_from' => $o['price_from'], 'currency' => $o['currency'],
        'sell_end_time' => $o['bil24']['sell_end_time'],
        'ticket_offices' => array_values(array_filter(array_merge([$o['partner_url']], $o['partner_urls_extra']))),
    ]];
    $keep[] = $g;
}
usort($keep, fn($a, $b) => strcmp($a['original']['date_local'], $b['original']['date_local']));
$posts = 0; $tr = 0; $tours = 0;
foreach ($keep as $g) { $posts += 1 + count($g['translations']); $tr += count($g['translations']); if ($g['original']['is_tour']) $tours++; }
lx_out(['generated' => gmdate('c'), 'source' => 'wp-events-export.php',
    'counts' => ['groups' => count($keep), 'posts' => $posts, 'translations' => $tr, 'tours' => $tours],
    'groups' => $keep]);
