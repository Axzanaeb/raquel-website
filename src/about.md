---
layout: base
title: About
intro: >-
  Welcome to my creative world! I'm Raquel, an artist specializing in tattoos, barro (clay work), and paintings.
journey: >-
  I've been creating art for over a decade, exploring various mediums and techniques. From intricate tattoo designs to expressive paintings and unique clay sculptures, each piece tells a story.
offerings:
  - Custom Tattoo Designs – Personalized artwork that becomes part of your story
  - Barro Sculptures – Handcrafted clay pieces with unique textures and forms
  - Original Paintings – Expressive works in various styles and mediums
  - Art Lessons – Weekly group sessions to explore creativity together
philosophy: >-
  Art is a universal language that connects us all. Through my work, I aim to create pieces that resonate with the soul and celebrate the beauty of human expression.
location_note: Located in Amarante, Portugal
---
<section class="container py-12 prose max-w-none">
  <h1>{{ title }}</h1>
  {% if intro %}<p>{{ intro }}</p>{% endif %}
  {% if journey %}<h2>My Journey</h2><p>{{ journey }}</p>{% endif %}
  {% if offerings %}<h2>What I Offer</h2><ul>{% for item in offerings %}<li>{{ item }}</li>{% endfor %}</ul>{% endif %}
  {% if philosophy %}<h2>Philosophy</h2><p>{{ philosophy }}</p>{% endif %}
  {% if location_note %}<hr><p><em>{{ location_note }}</em></p>{% endif %}
</section>
