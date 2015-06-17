<?php

error_reporting(E_ALL);
// print_r($_POST);
$body = @file_get_contents('php://input');

$data = json_decode($body);

libxml_use_internal_errors(true);
$c = file_get_contents($data->url);
// var_dump($c);
$d = new DomDocument();
$d->loadHTML($c);
// var_dump($c);
$xpath = new domxpath($d);

$result = array();
$rmetas = array();

// $query = '//*/meta[starts-with(@property, \'og:\')]';
// $metas = $xpath->query($query);
// var_dump($metas);
// foreach ($metas as $meta) {
//     $property = $meta->getAttribute('property');
//     $content = $meta->getAttribute('content');
//     $rmetas[$property] = $content;
// }

// var_dump($xpath);
foreach ($xpath->query("//meta[@property='og:title']") as $el) {
    $result['title'] = $el->getAttribute("content");
}
foreach ($xpath->query("//title") as $el) {
    $result['title'] = $el->nodeValue;
}
foreach ($xpath->query("//meta[@property='og:url']") as $el) {
    $result['url'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@name='thumbnail']") as $el) { //[@property='og:description']
    $result['thumbnail'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@property='og:image']") as $el) {
    $result['thumbnail'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@property='og:site_name']") as $el) {
    $result['site_name'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@property='article:author']") as $el) {
    $result['author'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@name='description']") as $el) { //[@property='og:description']
    $result['description'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@name='author']") as $el) { //[@property='og:description']
    $result['author'] = $el->getAttribute("content");
}
foreach ($xpath->query("//meta[@property='article:tag']") as $el) {
    $result['tags'] = $el->getAttribute("content");
}

if($result['thumbnail']) {
	$image = file_get_contents($result['thumbnail']);
	// $filetype = mime_content_type($image);
	$info     = pathinfo($result['thumbnail']);
	// $finfo = finfo_open(FILEINFO_MIME_TYPE);
	// var_dump($info['extension']);
	// die;
	// $filetype = finfo_file($finfo, $image);
	$result['image'] = 'data:image/' . $info['extension'] . ';base64,' . base64_encode($image);
}

echo json_encode($result);