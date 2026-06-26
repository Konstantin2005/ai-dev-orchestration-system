# Review: [title]

## Summary
- **Issue:** #[id]
- **Reviewer:** [reviewer]

## Checklist

### Security
{% if security_issues %}
- [ ] Security issues found
{% each security_issues as issue %}
  - [issue]
{% endeach %}
{% else %}
- [x] No security issues
{% endif %}

### Architecture
{% if architecture_issues %}
- [ ] Architecture issues found
{% each architecture_issues as issue %}
  - [issue]
{% endeach %}
{% else %}
- [x] Architecture is sound
{% endif %}

### Code Quality
{% if quality_issues %}
- [ ] Quality issues found
{% each quality_issues as issue %}
  - [issue]
{% endeach %}
{% else %}
- [x] Code quality is acceptable
{% endif %}

## Recommendations
- [ ]

## Verdict
- [ ] Approve
- [ ] Changes requested
