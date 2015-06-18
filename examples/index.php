<?php

error_reporting(E_ALL);

require 'vendor/autoload.php';

// At the top of the file
use MediaEmbed\MediaEmbed;

$body = @file_get_contents('php://input');

$data = json_decode($body);

$url = $data->url;
// echo json_encode($MediaObject);

// // print_r($_POST);

libxml_use_internal_errors(true);
$c = file_get_contents($url);
// var_dump($c);
$d = new DomDocument();
$d->loadHTML($c);
// var_dump($c);
$xpath = new domxpath($d);

$result = array();
$rmetas = array();

$memc = new Memcache;

$cacheAvailable = $memc->connect('localhost',11211);

$uricache = $memc->get($url);

// // Somewhere in your (class) code
$MediaEmbed = new MediaEmbed();

if ($MediaObject = $MediaEmbed->parseUrl($url)) {

    $MediaObject->setAttribute("width","100%");

    $code = $MediaObject->getEmbedCode();

    $video = $code;

    $attributes = $MediaObject->getAttributes();
    $thumbnail = $MediaObject->image();

    $name = $MediaObject->name();
    // $icon = $MediaObject->icon();
    // $info     = pathinfo($icon);
    // $icon = 'data:image/' . $info['extension'] . ';base64,' . base64_encode($icon);
    // var_dump($icon);
    // $website = $MediaObject->website();
    // $icon = $MediaObject->icon();
    

    $height = $MediaObject->getAttributes("height");
    $width = $MediaObject->getAttributes("width");

    $result['video'] = array("embed_code"=>$video,"attrs"=>$attributes,"thumbnail"=>$thumbnail,"name"=>$name); //,"website"=>$website ,"icon"=>$icon
    echo json_encode($result);
    die;
}


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
    $result['tags'][] = $el->getAttribute("content");
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

$memc->set($data->url,$result);

echo json_encode($result);