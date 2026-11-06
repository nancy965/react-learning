import React, { useState, useEffect, useRef, useMemo } from "react";
import "./RichEmojiPicker.css";

// Comprehensive categorized emojis matching Gmail / Google standard
const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "SMILEYS AND EMOTIONS",
    emojis: [
      { char: "😀", name: "grinning" },
      { char: "😃", name: "smiley" },
      { char: "😄", name: "smile" },
      { char: "😁", name: "grin" },
      { char: "😆", name: "laughing" },
      { char: "😅", name: "sweat_smile" },
      { char: "😂", name: "joy" },
      { char: "🤣", name: "rofl" },
      { char: "🥲", name: "smiling_tear" },
      { char: "🥹", name: "holding_tears" },
      { char: "😊", name: "blush" },
      { char: "😇", name: "innocent" },
      { char: "🙂", name: "slightly_smiling" },
      { char: "🙃", name: "upside_down" },
      { char: "😉", name: "wink" },
      { char: "😌", name: "relieved" },
      { char: "😍", name: "heart_eyes" },
      { char: "🥰", name: "smiling_hearts" },
      { char: "😘", name: "kissing_heart" },
      { char: "😗", name: "kissing" },
      { char: "😙", name: "kissing_smiling" },
      { char: "😚", name: "kissing_closed" },
      { char: "😋", name: "yum" },
      { char: "😛", name: "stuck_out_tongue" },
      { char: "😝", name: "tongue_closed_eyes" },
      { char: "😜", name: "tongue_wink" },
      { char: "🤪", name: "zany" },
      { char: "🤨", name: "raised_eyebrow" },
      { char: "🧐", name: "monocle" },
      { char: "🤓", name: "nerd" },
      { char: "😎", name: "sunglasses" },
      { char: "🥸", name: "disguised" },
      { char: "🤩", name: "star_struck" },
      { char: "🥳", name: "partying" },
      { char: "😏", name: "smirk" },
      { char: "😒", name: "unamused" },
      { char: "😞", name: "disappointed" },
      { char: "😔", name: "pensive" },
      { char: "😟", name: "worried" },
      { char: "😕", name: "confused" },
      { char: "🙁", name: "slightly_frowning" },
      { char: "☹️", name: "frowning" },
      { char: "😣", name: "persevere" },
      { char: "😖", name: "confounded" },
      { char: "😫", name: "tired" },
      { char: "😩", name: "weary" },
      { char: "🥺", name: "pleading" },
      { char: "😢", name: "cry" },
      { char: "😭", name: "sob" },
      { char: "😮‍💨", name: "exhaling" },
      { char: "😤", name: "triumph" },
      { char: "😠", name: "angry" },
      { char: "😡", name: "rage" },
      { char: "🤬", name: "cursing" },
      { char: "🤯", name: "exploding_head" },
      { char: "😳", name: "flushed" },
      { char: "🥵", name: "hot_face" },
      { char: "🥶", name: "cold_face" },
      { char: "😱", name: "scream" },
      { char: "😨", name: "fearful" },
      { char: "😰", name: "cold_sweat" },
      { char: "😥", name: "relieved_sad" },
      { char: "😓", name: "sweat" },
      { char: "🤗", name: "hugs" },
      { char: "🤔", name: "thinking" },
      { char: "🫣", name: "peeking" },
      { char: "🤭", name: "hand_over_mouth" },
      { char: "🤫", name: "shushing" },
      { char: "🤥", name: "lying" },
      { char: "😶", name: "no_mouth" },
      { char: "😐", name: "neutral" },
      { char: "😑", name: "expressionless" },
      { char: "😬", name: "grimacing" },
      { char: "🫠", name: "melting" },
      { char: "🙄", name: "roll_eyes" },
      { char: "😯", name: "hushed" },
      { char: "😦", name: "frowning_open" },
      { char: "😧", name: "anguished" },
      { char: "😮", name: "open_mouth" },
      { char: "😲", name: "astonished" },
      { char: "🥱", name: "yawning" },
      { char: "😴", name: "sleeping" },
      { char: "🤤", name: "drooling" },
      { char: "😪", name: "sleepy" },
      { char: "😵", name: "dizzy" },
      { char: "🤐", name: "zipper_mouth" },
      { char: "🥴", name: "woozy" },
      { char: "🤢", name: "nauseated" },
      { char: "🤮", name: "vomiting" },
      { char: "🤧", name: "sneezing" },
      { char: "😷", name: "mask" },
      { char: "🤒", name: "thermometer" },
      { char: "🤕", name: "bandage" },
    ],
  },
  {
    id: "people",
    name: "PEOPLE AND BODY",
    emojis: [
      { char: "👋", name: "wave" },
      { char: "🤚", name: "raised_back_of_hand" },
      { char: "🖐️", name: "splayed_hand" },
      { char: "✋", name: "raised_hand" },
      { char: "🖖", name: "vulcan_salute" },
      { char: "👌", name: "ok_hand" },
      { char: "🤌", name: "pinched_fingers" },
      { char: "🤏", name: "pinching_hand" },
      { char: "✌️", name: "victory" },
      { char: "🤞", name: "crossed_fingers" },
      { char: "🫰", name: "hand_heart" },
      { char: "🤟", name: "love_you" },
      { char: "🤘", name: "rock_on" },
      { char: "🤙", name: "call_me" },
      { char: "👈", name: "point_left" },
      { char: "👉", name: "point_right" },
      { char: "👆", name: "point_up" },
      { char: "👇", name: "point_down" },
      { char: "☝️", name: "index_up" },
      { char: "👍", name: "thumbs_up" },
      { char: "👎", name: "thumbs_down" },
      { char: "✊", name: "fist" },
      { char: "👊", name: "punch" },
      { char: "🤛", name: "left_fist" },
      { char: "🤜", name: "right_fist" },
      { char: "👏", name: "clap" },
      { char: "🙌", name: "raised_hands" },
      { char: "🫶", name: "heart_hands" },
      { char: "👐", name: "open_hands" },
      { char: "🤲", name: "palms_up" },
      { char: "🤝", name: "handshake" },
      { char: "🙏", name: "pray" },
      { char: "✍️", name: "writing" },
      { char: "💅", name: "nail_polish" },
      { char: "🤳", name: "selfie" },
      { char: "💪", name: "muscle" },
      { char: "👀", name: "eyes" },
      { char: "👁️", name: "eye" },
      { char: "👅", name: "tongue" },
      { char: "👄", name: "mouth" },
      { char: "👶", name: "baby" },
      { char: "🧒", name: "child" },
      { char: "👦", name: "boy" },
      { char: "👧", name: "girl" },
      { char: "🧑", name: "person" },
      { char: "👨", name: "man" },
      { char: "👩", name: "woman" },
      { char: "🧓", name: "elder" },
      { char: "👴", name: "grandpa" },
      { char: "👵", name: "grandma" },
      { char: "🙋", name: "raising_hand" },
      { char: "💁", name: "tipping_hand" },
      { char: "🙆", name: "ok_gesture" },
      { char: "🙅", name: "no_gesture" },
      { char: "🤷", name: "shrug" },
      { char: "🤦", name: "facepalm" },
      { char: "🙇", name: "bow" },
    ],
  },
  {
    id: "nature",
    name: "ANIMALS AND NATURE",
    emojis: [
      { char: "🐶", name: "dog" },
      { char: "🐱", name: "cat" },
      { char: "🐭", name: "mouse" },
      { char: "🐹", name: "hamster" },
      { char: "🐰", name: "rabbit" },
      { char: "🦊", name: "fox" },
      { char: "🐻", name: "bear" },
      { char: "🐼", name: "panda" },
      { char: "🐨", name: "koala" },
      { char: "🐯", name: "tiger" },
      { char: "🦁", name: "lion" },
      { char: "🐮", name: "cow" },
      { char: "🐷", name: "pig" },
      { char: "🐸", name: "frog" },
      { char: "🐵", name: "monkey" },
      { char: "🐔", name: "chicken" },
      { char: "🐧", name: "penguin" },
      { char: "🐦", name: "bird" },
      { char: "🐤", name: "chick" },
      { char: "🦆", name: "duck" },
      { char: "🦅", name: "eagle" },
      { char: "🦉", name: "owl" },
      { char: "🦇", name: "bat" },
      { char: "🐺", name: "wolf" },
      { char: "🦄", name: "unicorn" },
      { char: "🐝", name: "bee" },
      { char: "🐛", name: "bug" },
      { char: "🦋", name: "butterfly" },
      { char: "🐌", name: "snail" },
      { char: "🐞", name: "ladybug" },
      { char: "🐜", name: "ant" },
      { char: "🐢", name: "turtle" },
      { char: "🐍", name: "snake" },
      { char: "🐙", name: "octopus" },
      { char: "🐬", name: "dolphin" },
      { char: "🐳", name: "whale" },
      { char: "🦈", name: "shark" },
      { char: "💐", name: "bouquet" },
      { char: "🌸", name: "cherry_blossom" },
      { char: "💮", name: "white_flower" },
      { char: "🌹", name: "rose" },
      { char: "🌺", name: "hibiscus" },
      { char: "🌻", name: "sunflower" },
      { char: "🌼", name: "blossom" },
      { char: "🌷", name: "tulip" },
      { char: "🌱", name: "seedling" },
      { char: "🌲", name: "evergreen" },
      { char: "🌳", name: "tree" },
      { char: "🌴", name: "palm_tree" },
      { char: "🌵", name: "cactus" },
      { char: "🍀", name: "four_leaf_clover" },
      { char: "🍁", name: "maple_leaf" },
      { char: "🍂", name: "fallen_leaf" },
    ],
  },
  {
    id: "food",
    name: "FOOD AND DRINK",
    emojis: [
      { char: "🍏", name: "green_apple" },
      { char: "🍎", name: "red_apple" },
      { char: "🍐", name: "pear" },
      { char: "🍊", name: "orange" },
      { char: "🍋", name: "lemon" },
      { char: "🍌", name: "banana" },
      { char: "🍉", name: "watermelon" },
      { char: "🍇", name: "grapes" },
      { char: "🍓", name: "strawberry" },
      { char: "🫐", name: "blueberry" },
      { char: "🍒", name: "cherries" },
      { char: "🍑", name: "peach" },
      { char: "🥭", name: "mango" },
      { char: "🍍", name: "pineapple" },
      { char: "🥥", name: "coconut" },
      { char: "🥝", name: "kiwi" },
      { char: "🥑", name: "avocado" },
      { char: "🍕", name: "pizza" },
      { char: "🍔", name: "burger" },
      { char: "🍟", name: "fries" },
      { char: "🌭", name: "hotdog" },
      { char: "🥪", name: "sandwich" },
      { char: "🌮", name: "taco" },
      { char: "🌯", name: "burrito" },
      { char: "🥗", name: "salad" },
      { char: "🍝", name: "spaghetti" },
      { char: "🍜", name: "ramen" },
      { char: "🍣", name: "sushi" },
      { char: "🍱", name: "bento" },
      { char: "🥟", name: "dumpling" },
      { char: "🍦", name: "ice_cream" },
      { char: "🍧", name: "shaved_ice" },
      { char: "🍨", name: "icecream_bowl" },
      { char: "🍩", name: "doughnut" },
      { char: "🍪", name: "cookie" },
      { char: "🎂", name: "cake" },
      { char: "🍰", name: "shortcake" },
      { char: "🧁", name: "cupcake" },
      { char: "🍫", name: "chocolate" },
      { char: "🍿", name: "popcorn" },
      { char: "☕", name: "coffee" },
      { char: "🫖", name: "teapot" },
      { char: "🍵", name: "tea" },
      { char: "🧃", name: "juice" },
      { char: "🥤", name: "soda" },
      { char: "🧋", name: "bubble_tea" },
      { char: "🍺", name: "beer" },
      { char: "🍻", name: "beers" },
      { char: "🥂", name: "champagne" },
      { char: "🍷", name: "wine" },
    ],
  },
  {
    id: "travel",
    name: "TRAVEL AND PLACES",
    emojis: [
      { char: "🚗", name: "car" },
      { char: "🚕", name: "taxi" },
      { char: "🚙", name: "suv" },
      { char: "🚌", name: "bus" },
      { char: "🏎️", name: "race_car" },
      { char: "🚓", name: "police_car" },
      { char: "🚑", name: "ambulance" },
      { char: "🚒", name: "fire_engine" },
      { char: "🚚", name: "truck" },
      { char: "🚲", name: "bicycle" },
      { char: "🛴", name: "scooter" },
      { char: "🛵", name: "motor_scooter" },
      { char: "🏍️", name: "motorcycle" },
      { char: "🚨", name: "police_light" },
      { char: "✈️", name: "airplane" },
      { char: "🛫", name: "departure" },
      { char: "🛬", name: "arrival" },
      { char: "🚀", name: "rocket" },
      { char: "🛸", name: "ufo" },
      { char: "🚁", name: "helicopter" },
      { char: "⛵", name: "sailboat" },
      { char: "🚤", name: "speedboat" },
      { char: "🛳️", name: "cruise_ship" },
      { char: "⚓", name: "anchor" },
      { char: "⛽", name: "gas_station" },
      { char: "🚧", name: "construction" },
      { char: "🚦", name: "traffic_light" },
      { char: "🗺️", name: "map" },
      { char: "🗿", name: "moyai" },
      { char: "🗽", name: "statue_of_liberty" },
      { char: "🗼", name: "tokyo_tower" },
      { char: "🏰", name: "castle" },
      { char: "🏟️", name: "stadium" },
      { char: "🎡", name: "ferris_wheel" },
      { char: "🎢", name: "roller_coaster" },
      { char: "🏖️", name: "beach" },
      { char: "🏝️", name: "island" },
      { char: "🌋", name: "volcano" },
      { char: "⛰️", name: "mountain" },
      { char: "🏔️", name: "snow_mountain" },
      { char: "🏕️", name: "camping" },
      { char: "🏠", name: "house" },
      { char: "🏢", name: "office_building" },
      { char: "🏥", name: "hospital" },
      { char: "🏦", name: "bank" },
      { char: "🏨", name: "hotel" },
      { char: "🏫", name: "school" },
    ],
  },
  {
    id: "activities",
    name: "ACTIVITIES AND SPORTS",
    emojis: [
      { char: "⚽", name: "soccer" },
      { char: "🏀", name: "basketball" },
      { char: "🏈", name: "football" },
      { char: "⚾", name: "baseball" },
      { char: "🎾", name: "tennis" },
      { char: "🏐", name: "volleyball" },
      { char: "🏉", name: "rugby" },
      { char: "🎱", name: "8ball" },
      { char: "🏓", name: "ping_pong" },
      { char: "🏸", name: "badminton" },
      { char: "🏒", name: "hockey" },
      { char: "🥊", name: "boxing" },
      { char: "🥋", name: "martial_arts" },
      { char: "⛳", name: "golf" },
      { char: "🏹", name: "archery" },
      { char: "🎣", name: "fishing" },
      { char: "🛹", name: "skateboard" },
      { char: "🎿", name: "ski" },
      { char: "🏂", name: "snowboard" },
      { char: "🏋️", name: "weightlifting" },
      { char: "🧘", name: "yoga" },
      { char: "🏄", name: "surfing" },
      { char: "🏊", name: "swimming" },
      { char: "🏆", name: "trophy" },
      { char: "🥇", name: "gold_medal" },
      { char: "🥈", name: "silver_medal" },
      { char: "🥉", name: "bronze_medal" },
      { char: "🎖️", name: "military_medal" },
      { char: "🎟️", name: "ticket" },
      { char: "🎪", name: "circus" },
      { char: "🎨", name: "palette" },
      { char: "🎬", name: "movie" },
      { char: "🎤", name: "mic" },
      { char: "🎧", name: "headphones" },
      { char: "🎼", name: "music_score" },
      { char: "🎹", name: "keyboard_piano" },
      { char: "🥁", name: "drum" },
      { char: "🎷", name: "sax" },
      { char: "🎸", name: "guitar" },
      { char: "🎻", name: "violin" },
      { char: "🎲", name: "dice" },
      { char: "🎯", name: "bullseye" },
      { char: "🎳", name: "bowling" },
      { char: "🎮", name: "video_game" },
      { char: "🧩", name: "puzzle" },
    ],
  },
  {
    id: "objects",
    name: "OBJECTS",
    emojis: [
      { char: "📱", name: "mobile" },
      { char: "📲", name: "incoming_call" },
      { char: "💻", name: "laptop" },
      { char: "⌨️", name: "keyboard" },
      { char: "🖥️", name: "computer" },
      { char: "🖨️", name: "printer" },
      { char: "🖱️", name: "mouse" },
      { char: "📷", name: "camera" },
      { char: "📹", name: "camcorder" },
      { char: "📞", name: "phone" },
      { char: "📟", name: "pager" },
      { char: "📠", name: "fax" },
      { char: "📺", name: "tv" },
      { char: "📻", name: "radio" },
      { char: "⏰", name: "alarm_clock" },
      { char: "⏱️", name: "stopwatch" },
      { char: "⏳", name: "hourglass" },
      { char: "📡", name: "satellite" },
      { char: "🔋", name: "battery" },
      { char: "🔌", name: "plug" },
      { char: "💡", name: "lightbulb" },
      { char: "🔦", name: "flashlight" },
      { char: "🕯️", name: "candle" },
      { char: "🗑️", name: "trash" },
      { char: "💸", name: "money_wings" },
      { char: "💵", name: "dollar" },
      { char: "💰", name: "moneybag" },
      { char: "💳", name: "credit_card" },
      { char: "💎", name: "gem" },
      { char: "⚖️", name: "scales" },
      { char: "🔧", name: "wrench" },
      { char: "🔨", name: "hammer" },
      { char: "🛠️", name: "tools" },
      { char: "⚙️", name: "gear" },
      { char: "🧱", name: "brick" },
      { char: "⛓️", name: "chains" },
      { char: "🧲", name: "magnet" },
      { char: "🔫", name: "water_pistol" },
      { char: "💣", name: "bomb" },
      { char: "🧨", name: "firecracker" },
      { char: "🗡️", name: "sword" },
      { char: "🛡️", name: "shield" },
      { char: "💊", name: "pill" },
      { char: "🩹", name: "bandage" },
      { char: "🩺", name: "stethoscope" },
      { char: "🔬", name: "microscope" },
      { char: "🔭", name: "telescope" },
      { char: "📦", name: "package" },
      { char: "📫", name: "mailbox" },
      { char: "✉️", name: "envelope" },
      { char: "📨", name: "incoming_envelope" },
      { char: "📄", name: "page" },
      { char: "📅", name: "calendar" },
      { char: "📋", name: "clipboard" },
      { char: "📁", name: "folder" },
      { char: "📂", name: "open_folder" },
      { char: "📚", name: "books" },
      { char: "📖", name: "book" },
      { char: "🔖", name: "bookmark" },
      { char: "🔗", name: "link" },
      { char: "📎", name: "paperclip" },
      { char: "📌", name: "pin" },
      { char: "📍", name: "pushpin" },
      { char: "✂️", name: "scissors" },
      { char: "🖊️", name: "pen" },
      { char: "📝", name: "memo" },
      { char: "✏️", name: "pencil" },
      { char: "🔍", name: "search" },
      { char: "🔒", name: "locked" },
      { char: "🔓", name: "unlocked" },
      { char: "🔑", name: "key" },
    ],
  },
  {
    id: "symbols",
    name: "SYMBOLS",
    emojis: [
      { char: "❤️", name: "red_heart" },
      { char: "🧡", name: "orange_heart" },
      { char: "💛", name: "yellow_heart" },
      { char: "💚", name: "green_heart" },
      { char: "💙", name: "blue_heart" },
      { char: "💜", name: "purple_heart" },
      { char: "🤎", name: "brown_heart" },
      { char: "🖤", name: "black_heart" },
      { char: "🤍", name: "white_heart" },
      { char: "💔", name: "broken_heart" },
      { char: "❣️", name: "heart_exclamation" },
      { char: "💕", name: "two_hearts" },
      { char: "💞", name: "revolving_hearts" },
      { char: "💓", name: "heartbeat" },
      { char: "💗", name: "growing_heart" },
      { char: "💖", name: "sparkle_heart" },
      { char: "💘", name: "cupid" },
      { char: "💝", name: "gift_heart" },
      { char: "☮️", name: "peace" },
      { char: "✝️", name: "cross" },
      { char: "☪️", name: "crescent" },
      { char: "🕉️", name: "om" },
      { char: "☸️", name: "dharma" },
      { char: "✡️", name: "star_of_david" },
      { char: "☯️", name: "yin_yang" },
      { char: "🕎", name: "menorah" },
      { char: "⚛️", name: "atom" },
      { char: "♈", name: "aries" },
      { char: "♉", name: "taurus" },
      { char: "♊", name: "gemini" },
      { char: "♋", name: "cancer" },
      { char: "♌", name: "leo" },
      { char: "♍", name: "virgo" },
      { char: "♎", name: "libra" },
      { char: "♏", name: "scorpio" },
      { char: "♐", name: "sagittarius" },
      { char: "♑", name: "capricorn" },
      { char: "♒", name: "aquarius" },
      { char: "♓", name: "pisces" },
      { char: "🆔", name: "id_badge" },
      { char: "☢️", name: "radioactive" },
      { char: "☣️", name: "biohazard" },
      { char: "📴", name: "phone_off" },
      { char: "📳", name: "vibrate" },
      { char: "🆚", name: "vs" },
      { char: "❌", name: "cross_mark" },
      { char: "⭕", name: "circle" },
      { char: "🛑", name: "stop" },
      { char: "⛔", name: "no_entry" },
      { char: "🚫", name: "prohibited" },
      { char: "💯", name: "100" },
      { char: "💢", name: "anger" },
      { char: "♨️", name: "hotsprings" },
      { char: "⚠️", name: "warning" },
      { char: "🚸", name: "children" },
      { char: "🔰", name: "beginner" },
      { char: "♻️", name: "recycle" },
      { char: "✅", name: "check_mark" },
      { char: "✔️", name: "heavy_check" },
      { char: "⭐", name: "star" },
      { char: "🌟", name: "glowing_star" },
      { char: "✨", name: "sparkles" },
      { char: "⚡", name: "lightning" },
      { char: "💥", name: "collision" },
      { char: "🔥", name: "fire" },
      { char: "💧", name: "droplet" },
      { char: "💦", name: "sweat_drops" },
      { char: "🌊", name: "wave_ocean" },
      { char: "☀️", name: "sun" },
      { char: "☁️", name: "cloud" },
      { char: "🌧️", name: "rain" },
      { char: "❄️", name: "snowflake" },
      { char: "🌈", name: "rainbow" },
    ],
  },
  {
    id: "flags",
    name: "FLAGS",
    emojis: [
      { char: "🏁", name: "chequered_flag" },
      { char: "🚩", name: "triangular_flag" },
      { char: "🎌", name: "crossed_flags" },
      { char: "🏴", name: "black_flag" },
      { char: "🏳️", name: "white_flag" },
      { char: "🏳️‍🌈", name: "rainbow_flag" },
      { char: "🏳️‍⚧️", name: "transgender_flag" },
      { char: "🏴‍☠️", name: "pirate_flag" },
      { char: "🇮🇳", name: "flag_india" },
      { char: "🇺🇸", name: "flag_us" },
      { char: "🇬🇧", name: "flag_uk" },
      { char: "🇨🇦", name: "flag_canada" },
      { char: "🇦🇺", name: "flag_australia" },
      { char: "🇩🇪", name: "flag_germany" },
      { char: "🇫🇷", name: "flag_france" },
      { char: "🇯🇵", name: "flag_japan" },
      { char: "🇨🇳", name: "flag_china" },
      { char: "🇧🇷", name: "flag_brazil" },
      { char: "🇮🇹", name: "flag_italy" },
      { char: "🇪🇸", name: "flag_spain" },
      { char: "🇷🇺", name: "flag_russia" },
      { char: "🇰🇷", name: "flag_korea" },
      { char: "🇦🇪", name: "flag_uae" },
      { char: "🇸🇦", name: "flag_saudi_arabia" },
      { char: "🇿🇦", name: "flag_south_africa" },
      { char: "🇲🇽", name: "flag_mexico" },
    ],
  },
];

// Icons for category navigation matching Pic 2
const CATEGORY_TABS = [
  {
    id: "recent",
    title: "Recently Used",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" />
      </svg>
    ),
  },
  {
    id: "smileys",
    title: "Smileys & Emotions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
      </svg>
    ),
  },
  {
    id: "people",
    title: "People & Body",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm10 5h-7.5l-.9-2.2C13.2 8.3 12.6 8 12 8s-1.2.3-1.6.8L9.5 11H2v2h6.5l1.6 4.1L8.5 22h2.2l1.3-4 1.3 4h2.2l-1.6-4.9 1.6-4.1H22v-2z" />
      </svg>
    ),
  },
  {
    id: "nature",
    title: "Animals & Nature",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19h15.3l-.62-1.39C20.26 16.07 21 14.12 21 12c0-4.97-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z" />
      </svg>
    ),
  },
  {
    id: "food",
    title: "Food & Drink",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z" />
      </svg>
    ),
  },
  {
    id: "travel",
    title: "Travel & Places",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
      </svg>
    ),
  },
  {
    id: "activities",
    title: "Activities & Sports",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94A5.01 5.01 0 0 0 11 15.9V19H7v2h10v-2h-4v-3.1a5.01 5.01 0 0 0 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
      </svg>
    ),
  },
  {
    id: "objects",
    title: "Objects",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z" />
      </svg>
    ),
  },
  {
    id: "symbols",
    title: "Symbols",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
  },
  {
    id: "flags",
    title: "Flags",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z" />
      </svg>
    ),
  },
];

function RichEmojiPicker({ onSelectEmoji, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("recent");
  const [tooltipInfo, setTooltipInfo] = useState(null);
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      const stored = localStorage.getItem("email_center_recent_emojis");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const pickerRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const categoryRefs = useRef({});

  const handleEmojiHover = (emoji, e) => {
    if (!pickerRef.current || !e.currentTarget) return;
    const contRect = pickerRef.current.getBoundingClientRect();
    const btnRect = e.currentTarget.getBoundingClientRect();
    setTooltipInfo({
      name: emoji.name,
      top: btnRect.bottom - contRect.top + 2,
      left: btnRect.left - contRect.left + btnRect.width / 2,
    });
  };

  const handleEmojiLeave = () => {
    setTooltipInfo(null);
  };

  const handleSelect = (emoji) => {
    onSelectEmoji(emoji.char);

    // Save to recents (keep max 18)
    setRecentEmojis((prev) => {
      const filtered = prev.filter((item) => item.char !== emoji.char);
      const updated = [emoji, ...filtered].slice(0, 18);
      try {
        localStorage.setItem("email_center_recent_emojis", JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save recent emoji:", e);
      }
      return updated;
    });
  };

  // Filter emojis when search query is entered
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.trim().toLowerCase().replace(/^:|:$/g, "");
    const results = [];
    EMOJI_CATEGORIES.forEach((cat) => {
      cat.emojis.forEach((emoji) => {
        if (
          emoji.name.toLowerCase().includes(query) ||
          emoji.char.includes(query)
        ) {
          results.push(emoji);
        }
      });
    });
    return results;
  }, [searchQuery]);

  // Click on a category tab to scroll into view
  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    setSearchQuery("");
    if (tabId === "recent") {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } else if (categoryRefs.current[tabId]) {
      categoryRefs.current[tabId].scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      ref={pickerRef}
      className="rich-emoji-picker-container"
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Search Bar with Magnifying Glass matching Pic 2 */}
      <div className="rep-search-bar-wrap">
        <div className="rep-search-input-box">
          <svg className="rep-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2.4">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="rep-search-input"
            placeholder=":laughing:"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button
              type="button"
              className="rep-search-clear"
              onClick={() => setSearchQuery("")}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Icons Row with Blue Underline Indicator matching Pic 2 */}
      <div className="rep-category-tabs-row">
        {CATEGORY_TABS.map((tab) => {
          const isActive = activeTab === tab.id && !searchQuery;
          return (
            <button
              key={tab.id}
              type="button"
              className={`rep-category-tab-btn ${isActive ? "active" : ""}`}
              onClick={() => handleTabClick(tab.id)}
              title={tab.title}
            >
              <div className="rep-tab-icon-wrap">{tab.icon}</div>
              {isActive && <div className="rep-tab-active-indicator" />}
            </button>
          );
        })}
      </div>

      {/* Emoji Scrollable List */}
      <div className="rep-scroll-body" ref={scrollContainerRef}>
        {/* Search Results Mode */}
        {searchResults !== null ? (
          <div className="rep-section">
            <div className="rep-section-title">SEARCH RESULTS ({searchResults.length})</div>
            {searchResults.length === 0 ? (
              <div className="rep-empty-message">No emojis found for "{searchQuery}"</div>
            ) : (
              <div className="rep-emoji-grid">
                {searchResults.map((emoji) => (
                  <button
                    key={emoji.name}
                    type="button"
                    className="rep-emoji-btn"
                    onClick={() => handleSelect(emoji)}
                    onMouseEnter={(e) => handleEmojiHover(emoji, e)}
                    onMouseLeave={handleEmojiLeave}
                  >
                    <span className="rep-emoji-char">{emoji.char}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 1. RECENTLY USED SECTION matching Pic 2 */}
            <div
              className="rep-section"
              ref={(el) => (categoryRefs.current["recent"] = el)}
            >
              <div className="rep-section-title">RECENTLY USED</div>
              {recentEmojis.length === 0 ? (
                <div className="rep-empty-message">You haven't used any emojis yet.</div>
              ) : (
                <div className="rep-emoji-grid">
                  {recentEmojis.map((emoji) => (
                    <button
                      key={`recent-${emoji.name}`}
                      type="button"
                      className="rep-emoji-btn"
                      onClick={() => handleSelect(emoji)}
                      onMouseEnter={(e) => handleEmojiHover(emoji, e)}
                      onMouseLeave={handleEmojiLeave}
                    >
                      <span className="rep-emoji-char">{emoji.char}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Standard Categories matching Pic 2 */}
            {EMOJI_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="rep-section"
                ref={(el) => (categoryRefs.current[cat.id] = el)}
              >
                <div className="rep-section-title">{cat.name}</div>
                <div className="rep-emoji-grid">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji.name}
                      type="button"
                      className="rep-emoji-btn"
                      onClick={() => handleSelect(emoji)}
                      onMouseEnter={(e) => handleEmojiHover(emoji, e)}
                      onMouseLeave={handleEmojiLeave}
                    >
                      <span className="rep-emoji-char">{emoji.char}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Floating Tooltip matching Pic 2 e.g. :laughing: */}
      {tooltipInfo && (
        <div
          className="rep-floating-tooltip"
          style={{
            top: `${tooltipInfo.top}px`,
            left: `${tooltipInfo.left}px`,
          }}
        >
          <span>:{tooltipInfo.name}:</span>
        </div>
      )}
    </div>
  );
}

export default RichEmojiPicker;
