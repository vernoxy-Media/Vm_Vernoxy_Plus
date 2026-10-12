import { CompanyFormData } from '../schemas/company-form.schema';

export function formatChannelsForApi(channels: CompanyFormData['channels']) {
  return (channels || []).map((ch) => ({
    ...(ch.channel_id ? { channel_id: Number(ch.channel_id) } : {}),
    channel_type: ch.channel_type,
    value: ch.value.trim(),
    ...(ch.label?.trim() ? { label: ch.label.trim() } : {}),
    is_primary: Boolean(ch.is_primary),
  }));
}

export function formatContactsForApi(contacts: CompanyFormData['contacts']) {
  return (contacts || []).map((ct) => {
    const item: any = {
      ...(ct.company_person_id ? { company_person_id: Number(ct.company_person_id) } : {}),
      ...(ct.person_id ? { person_id: Number(ct.person_id) } : {}),
      ...(ct.designation?.trim() ? { designation: ct.designation.trim() } : {}),
      ...(ct.department_id ? { department_id: Number(ct.department_id) } : {}),
      is_primary: Boolean(ct.is_primary),
    };
    if (ct.reports_to_index !== null && ct.reports_to_index !== undefined) {
      item.reports_to_index = Number(ct.reports_to_index);
    }
    if (ct.reports_to_company_person_id) {
      item.reports_to_company_person_id = Number(ct.reports_to_company_person_id);
    }
    if (!ct.person_id) {
      item.person = {
        name: (ct.name || '').trim(),
        ...(ct.email?.trim() ? { email: ct.email.trim() } : {}),
        ...(ct.mobile?.trim() ? { mobile: ct.mobile.trim() } : {}),
        ...(ct.linkedin_url?.trim() ? { linkedin_url: ct.linkedin_url.trim() } : {}),
      };
    }
    return item;
  });
}

export function buildCreateCompanyPayload(values: CompanyFormData) {
  return {
    name: values.name.trim(),
    customer_type_id: Number(values.customer_type_id),
    industry_id: Number(values.industry_id),
    ...(values.sub_industry_id ? { sub_industry_id: Number(values.sub_industry_id) } : {}),
    ...(values.parent_company_id ? { parent_company_id: Number(values.parent_company_id) } : {}),
    ...(values.owner_id ? { owner_id: Number(values.owner_id) } : {}),
    ...(values.address?.trim() ? { address: values.address.trim() } : {}),
    ...(values.city?.trim() ? { city: values.city.trim() } : {}),
    ...(values.state?.trim() ? { state: values.state.trim() } : {}),
    ...(values.country?.trim() ? { country: values.country.trim() } : {}),
    channels: formatChannelsForApi(values.channels),
    contacts: formatContactsForApi(values.contacts),
  };
}

export function buildUpdateCompanyPayload(values: CompanyFormData) {
  return {
    name: values.name.trim(),
    customer_type_id: Number(values.customer_type_id),
    industry_id: Number(values.industry_id),
    sub_industry_id: values.sub_industry_id ? Number(values.sub_industry_id) : null,
    parent_company_id: values.parent_company_id ? Number(values.parent_company_id) : null,
    owner_id: values.owner_id ? Number(values.owner_id) : null,
    address: values.address?.trim() || null,
    city: values.city?.trim() || null,
    state: values.state?.trim() || null,
    country: values.country?.trim() || null,
    is_active: values.is_active !== undefined ? values.is_active : true,
    channels: formatChannelsForApi(values.channels),
    contacts: formatContactsForApi(values.contacts),
  };
}
