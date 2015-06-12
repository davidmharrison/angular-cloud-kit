<?php


$api = "309696db24cbfcc1b79a0750af4dfa92b89588bc5bbbf16ea9fdebe9d2b3446d";
$container = "iCloud.watchinharrison.Read-The-News";
$environment = "development";

$cookiecontainer = str_replace('.', '_', $container);

// print_r($_COOKIE[$cookiecontainer]);
// die;

$_SESSION['ckSession'] = "4__24__AYqhT989lcuoTpZ1WdkFzEMAixcFPWFVKep319Jp0leg+hhhNcyt/jghtT/d4j6Nf6rhUDA0/DWZj31benreVl12X0soJxTq7sTwkYj5snyjXgDF4/0ecuSov1P05VeMX81u/VOmY4SBtsRaPxNkRrAKSsn+hRh3SA==__QXBwbDoxOgFzWjffe/nJZOpklvZchDMNMudDog0BusSYOrv54wzj6w9rGsc/1/JU6K4r46uJuG4N7/xCt7GWBecwwZK2eXgd";

$url = "https://api.apple-cloudkit.com/database/1/$container/$environment/public/users/current?ckAPIToken=$api";

$headers = array('Content-Type: application/json');

if($_COOKIE[$cookiecontainer]) {
	$url .= "&ckSession=".$_COOKIE[$cookiecontainer];
}

// echo $url;
// die;

$curl = curl_init();
// Set some options - we are passing in a useragent too here
curl_setopt_array($curl, array(
    CURLOPT_RETURNTRANSFER => 1,
    CURLOPT_URL => $url,
    CURLOPT_HTTPHEADER => $headers
));
// Send the request & save response to $resp
$resp = curl_exec($curl);
// Close request to clear up some resources
curl_close($curl);

$data = json_decode($resp);

print_r($data);

// header('Location: '.$data->redirectUrl); //."&referrer=http://cloudkit.dev/index.php"