---
layout: default
title: Home
---

### 🚀 Últimos posts

{% for post in site.posts %}
#### [{{ post.title }}]({{ post.url | relative_url }})
*{{ post.date | date: "%d/%m/%Y" }}* — {{ post.description }}
{% endfor %}

---

### 🚀 Repositorios públicos

{% for repo in site.github.public_repositories %}{% unless repo.fork %}
#### [{{ repo.name }}]({{ repo.html_url }}/blob/{{ repo.default_branch }}/README.md)
{% if repo.description %}*{{ repo.description }}*{% endif %}
{% endunless %}{% endfor %}

---

### 📬 Let's talk
* **LinkedIn:** [in/armandomeabe](https://www.linkedin.com/in/armandomeabe/)
* **Gravatar:** [armandomeabe](https://gravatar.com/armandomeabe)
