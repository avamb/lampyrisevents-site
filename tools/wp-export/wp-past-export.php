<?php
// Archive: every past-event group whose original is NOT upcoming, all languages, with media and photo reports.
$ids = lx_all_event_ids();
$groups = lx_groups($ids);
$keep = [];
foreach ($groups as $g) {
    if (lx_is_actual($g['original'])) continue;
    $keep[] = $g;
}
usort($keep, fn($a, $b) => strcmp($b['original']['date_local'], $a['original']['date_local']));
$posts = 0; $tr = 0; $media = 0; $reports = 0;
foreach ($keep as $g) {
    $posts += 1 + count($g['translations']); $tr += count($g['translations']);
    foreach (array_merge([$g['original']], array_values($g['translations'])) as $r) {
        $media += count($r['media']['poster']) + count($r['media']['gallery']);
        foreach ($r['lops'] as $k => $v) if (strpos($k, 'lops_report_') === 0 && $v) $reports++;
    }
}
lx_out(['generated' => gmdate('c'), 'source' => 'wp-past-export.php',
    'counts' => ['groups' => count($keep), 'posts' => $posts, 'translations' => $tr, 'media_items' => $media, 'report_fields' => $reports],
    'groups' => $keep]);
